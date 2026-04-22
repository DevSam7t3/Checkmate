import { Request, Response, NextFunction } from "express";

import {
	createStatusPageBodyValidation,
	getStatusPageMonitorParamValidation,
	getStatusPageParamValidation,
	getStatusPageQueryValidation,
	imageValidation,
} from "@/validation/statusPageValidation.js";
import { AppError } from "@/utils/AppError.js";
import { requireTeamId, requireUserId } from "@/controllers/controllerUtils.js";
import { IStatusPageService } from "@/service/business/statusPageService.js";
import { IMonitorsRepository } from "@/repositories/index.js";
import { ISettingsService } from "@/service/system/settingsService.js";
import { NormalizeData } from "@/utils/dataUtils.js";

const SERVICE_NAME = "statusPageController";

type LatencyStats = {
	latest: number | null;
	average: number | null;
	trimmedAverage: number | null;
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const resolveSlaTier = (uptimePercentage: number) => {
	if (uptimePercentage >= 99.99) return "Platinum";
	if (uptimePercentage >= 99.9) return "Gold";
	if (uptimePercentage >= 99.5) return "Silver";
	return "Bronze";
};

const resolveRisk = (uptimePercentage: number) => {
	if (uptimePercentage >= 99.9) return "Low";
	if (uptimePercentage >= 99) return "Medium";
	return "High";
};

const getLatencyStats = (checks: { responseTime: number }[]): LatencyStats => {
	if (!checks.length) {
		return {
			latest: null,
			average: null,
			trimmedAverage: null,
		};
	}

	const latest = Math.floor(checks[checks.length - 1]?.responseTime ?? 0);
	const average = Math.round(checks.reduce((sum, check) => sum + check.responseTime, 0) / checks.length);

	const sortedResponseTimes = checks.map((check) => check.responseTime).sort((a, b) => a - b);
	const trimSize = Math.floor(sortedResponseTimes.length * 0.1);
	const trimmed =
		sortedResponseTimes.length > 2 * trimSize ? sortedResponseTimes.slice(trimSize, sortedResponseTimes.length - trimSize) : sortedResponseTimes;
	const trimmedAverage = trimmed.length ? Math.round(trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length) : average;

	return {
		latest,
		average,
		trimmedAverage,
	};
};

const getResponseThresholds = (checks: { status: boolean; responseTime: number }[]) => {
	const responseTimes = checks.filter((check) => check.status).map((check) => check.responseTime);

	if (!responseTimes.length) {
		return { p75: 0, p95: 0 };
	}

	const sorted = [...responseTimes].sort((a, b) => a - b);
	const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1];
	const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];

	return { p75, p95 };
};

const resolveHeartbeatState = (check: { status: boolean; responseTime: number }, thresholds: { p75: number; p95: number }) => {
	if (!check.status) {
		return "down" as const;
	}

	if (check.responseTime > thresholds.p95) {
		return "degraded" as const;
	}

	if (check.responseTime > thresholds.p75) {
		return "pending" as const;
	}

	return "healthy" as const;
};

export interface IStatusPageController {
	readonly serviceName: string;
	createStatusPage(req: Request, res: Response, next: NextFunction): Promise<Response | void>;
	updateStatusPage(req: Request, res: Response, next: NextFunction): Promise<Response | void>;
	getStatusPageByUrl(req: Request, res: Response, next: NextFunction): Promise<Response | void>;
	getStatusPageMonitorById(req: Request, res: Response, next: NextFunction): Promise<Response | void>;
	getStatusPagesByTeamId(req: Request, res: Response, next: NextFunction): Promise<Response | void>;
	deleteStatusPage(req: Request, res: Response, next: NextFunction): Promise<Response | void>;
}

class StatusPageController implements IStatusPageController {
	static SERVICE_NAME = SERVICE_NAME;
	private statusPageService: IStatusPageService;
	private monitorsRepository: IMonitorsRepository;
	private settingsService: ISettingsService;
	constructor(statusPageService: IStatusPageService, monitorsRepository: IMonitorsRepository, settingsService: ISettingsService) {
		this.statusPageService = statusPageService;
		this.monitorsRepository = monitorsRepository;
		this.settingsService = settingsService;
	}

	get serviceName() {
		return StatusPageController.SERVICE_NAME;
	}

	createStatusPage = async (req: Request, res: Response, next: NextFunction) => {
		try {
			createStatusPageBodyValidation.parse(req.body);
			if (req.file) {
				imageValidation.parse(req.file);
			}

			const teamId = requireTeamId(req?.user?.teamId);
			const userId = requireUserId(req?.user?.id);
			const statusPage = await this.statusPageService.createStatusPage(userId, teamId, req.file, req.body);

			return res.status(200).json({
				success: true,
				msg: "Status page created successfully",
				data: statusPage,
			});
		} catch (error) {
			next(error);
		}
	};

	updateStatusPage = async (req: Request, res: Response, next: NextFunction) => {
		try {
			createStatusPageBodyValidation.parse(req.body);
			if (req.file) {
				imageValidation.parse(req.file);
			}
			const teamId = requireTeamId(req?.user?.teamId);
			const statusPageId = req.params.id as string;
			if (!statusPageId) {
				throw new AppError({ message: "Status page ID is required", status: 400 });
			}
			const statusPage = await this.statusPageService.updateStatusPage(statusPageId, teamId, req.file, req.body);
			if (statusPage === null) {
				throw new AppError({ message: "Status page not found", status: 404 });
			}
			res.status(200).json({
				success: true,
				msg: "Status page updated successfully",
				data: statusPage,
			});
		} catch (error) {
			next(error);
		}
	};

	getStatusPageByUrl = async (req: Request, res: Response, next: NextFunction) => {
		try {
			getStatusPageParamValidation.parse(req.params);
			getStatusPageQueryValidation.parse(req.query);

			if (!req.params.url) {
				throw new AppError({ message: "Status page URL is required", status: 400 });
			}

			const statusPage = await this.statusPageService.getStatusPageByUrl(req.params.url as string);

			if (!statusPage.isPublished) {
				const teamId = requireTeamId(req?.user?.teamId);
				if (statusPage.teamId !== teamId) {
					throw new AppError({ message: "Forbidden", status: 403 });
				}
			}

			const settings = await this.settingsService.getDBSettings();
			const showURL = settings.showURL;

			const monitors = await this.monitorsRepository.findByIds(statusPage.monitors);
			// Sort monitors according to the order in statusPage.monitors
			const monitorOrder = new Map(statusPage.monitors.map((id, index) => [id, index]));
			const sortedMonitors = [...monitors].sort((a, b) => {
				const orderA = monitorOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
				const orderB = monitorOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
				return orderA - orderB;
			});

			const normalizedMonitors = sortedMonitors.map((monitor) => {
				const normalizedChecks = NormalizeData(monitor.recentChecks, 10, 100);
				if (!showURL) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { url, port, secret, notifications, ...rest } = monitor;
					return { ...rest, checks: normalizedChecks };
				}
				return { ...monitor, checks: normalizedChecks };
			});
			return res.status(200).json({
				success: true,
				msg: "Status page retrieved successfully",
				data: { statusPage, monitors: normalizedMonitors },
			});
		} catch (error) {
			next(error);
		}
	};
	getStatusPagesByTeamId = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const teamId = requireTeamId(req.user?.teamId);
			const statusPages = await this.statusPageService.getStatusPagesByTeamId(teamId);

			return res.status(200).json({
				success: true,
				msg: "Status pages retrieved successfully",
				data: statusPages,
			});
		} catch (error) {
			next(error);
		}
	};

	getStatusPageMonitorById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			getStatusPageMonitorParamValidation.parse(req.params);

			const url = req.params.url;
			const monitorId = req.params.monitorId;

			if (!url) {
				throw new AppError({ message: "Status page URL is required", status: 400 });
			}

			if (!monitorId) {
				throw new AppError({ message: "Monitor ID is required", status: 400 });
			}

			const statusPage = await this.statusPageService.getStatusPageByUrl(url);

			if (!statusPage.isPublished) {
				const teamId = requireTeamId(req?.user?.teamId);
				if (statusPage.teamId !== teamId) {
					throw new AppError({ message: "Forbidden", status: 403 });
				}
			}

			if (!statusPage.monitors.includes(monitorId)) {
				throw new AppError({ message: "Monitor not found in this status page", status: 404 });
			}

			const settings = await this.settingsService.getDBSettings();
			const showURL = settings.showURL;

			const monitors = await this.monitorsRepository.findByIds([monitorId]);
			const monitor = monitors[0];

			if (!monitor) {
				throw new AppError({ message: "Monitor not found", status: 404 });
			}

			const checks = NormalizeData(monitor.recentChecks, 10, 100);
			const recentTimelineChecks = checks.slice(-50).filter((check) => typeof check.responseTime === "number" && !Number.isNaN(check.responseTime));

			const thresholds = getResponseThresholds(recentTimelineChecks);
			const counters = {
				healthy: 0,
				degraded: 0,
				pending: 0,
				down: 0,
				maintenance: monitor.status === "maintenance" ? 1 : 0,
			};

			for (const check of recentTimelineChecks) {
				const state = resolveHeartbeatState(check, thresholds);
				counters[state] += 1;
			}

			const successfulChecks = checks.filter((check) => check.status === true).length;
			const computedUptime = checks.length ? (successfulChecks / checks.length) * 100 : 0;
			const uptimePercentage = clampPercentage(
				typeof monitor.uptimePercentage === "number" && !Number.isNaN(monitor.uptimePercentage) ? monitor.uptimePercentage : computedUptime
			);

			const latencyChecks = checks.filter((check) => typeof check.responseTime === "number" && !Number.isNaN(check.responseTime));
			const latencyStats = getLatencyStats(latencyChecks);
			const lastCheckAt = checks[checks.length - 1]?.createdAt ?? null;

			const monitorWithChecks = showURL
				? { ...monitor, checks }
				: (() => {
						// Remove sensitive endpoint values when showURL is disabled.
						const { url: _url, port, secret, notifications, ...rest } = monitor;
						return { ...rest, checks };
					})();

			return res.status(200).json({
				success: true,
				msg: "Status page monitor retrieved successfully",
				data: {
					statusPage,
					monitor: monitorWithChecks,
					summary: {
						uptimePercentage,
						slaTier: resolveSlaTier(uptimePercentage),
						risk: resolveRisk(uptimePercentage),
						lastCheckAt,
						latency: latencyStats,
						recentTimeline: {
							windowSize: recentTimelineChecks.length,
							healthy: counters.healthy,
							degraded: counters.degraded,
							pending: counters.pending,
							down: counters.down,
							maintenance: counters.maintenance,
							incidents: counters.down,
						},
					},
				},
			});
		} catch (error) {
			next(error);
		}
	};

	deleteStatusPage = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const statusPageId = req.params.id as string;
			if (!statusPageId) {
				throw new AppError({ message: "Status page ID is required", status: 400 });
			}
			const teamId = requireTeamId(req.user?.teamId);
			await this.statusPageService.deleteStatusPage(statusPageId, teamId);
			return res.status(200).json({
				success: true,
				msg: "Status page deleted successfully",
			});
		} catch (error) {
			next(error);
		}
	};
}

export default StatusPageController;
