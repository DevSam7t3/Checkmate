import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { StatusLabel, BaseBox } from "@/Components/design-elements";
import { InfrastructureMetrics } from "@/Pages/StatusPage/Status/Components/InfrastructureMetrics";
import { AlertTriangle, CheckCircle2, PauseCircle, Wrench } from "lucide-react";
import dayjs from "dayjs";
import {
	ResponsiveContainer,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip as RechartsTooltip,
	RadialBarChart,
	PolarAngleAxis,
	RadialBar,
	AreaChart,
	Area,
} from "recharts";

import { alpha, useTheme, type Theme } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Monitor } from "@/Types/Monitor";
import type { StatusPage } from "@/Types/StatusPage";
import type { RootState } from "@/Types/state";
import { Divider } from "@mui/material";

interface StatusPageMonitor extends Monitor {
	checks?: Monitor["recentChecks"];
}

interface MonitorsListProps {
	statusPage: StatusPage;
	monitors: StatusPageMonitor[];
}

type MonitorCheck = NonNullable<StatusPageMonitor["checks"]>[number];

type RangeKey = "100-points" | "50-points" | "25-points" | "10-points";

type LatencyChartPoint = {
	time: number;
	ping: number;
	createdAt: string;
};

const countRanges: Array<{ key: RangeKey; count: number }> = [
	{ key: "100-points", count: 100 },
	{ key: "50-points", count: 50 },
	{ key: "25-points", count: 25 },
	{ key: "10-points", count: 10 },
];

const getStatusColor = (status: StatusPageMonitor["status"], theme: Theme) => {
	if (status === "up") return theme.palette.success.main;
	if (status === "maintenance") return theme.palette.info.main;
	if (status === "paused" || status === "initializing") return theme.palette.warning.main;
	return theme.palette.error.main;
};

const getStatusIcon = (status: StatusPageMonitor["status"]) => {
	if (status === "up") return CheckCircle2;
	if (status === "maintenance") return Wrench;
	if (status === "paused" || status === "initializing") return PauseCircle;
	return AlertTriangle;
};

const formatUptime = (value?: number) => {
	if (typeof value !== "number" || Number.isNaN(value)) return "--";
	return `${Math.max(0, Math.min(100, value)).toFixed(2)}%`;
};

const resolveUptimePercentage = (monitor: StatusPageMonitor) => {
	if (
		typeof monitor.uptimePercentage === "number" &&
		!Number.isNaN(monitor.uptimePercentage)
	) {
		return Math.max(0, Math.min(100, monitor.uptimePercentage));
	}

	const checks = monitor.checks ?? [];
	if (!checks.length) return 0;

	const successfulChecks = checks.filter((check) => check.status === true).length;
	return (successfulChecks / checks.length) * 100;
};

const getLatencyStats = (checks: StatusPageMonitor["checks"]) => {
	const validChecks = checks?.filter((check) => check?.responseTime != null) ?? [];
	if (validChecks.length === 0) {
		return {
			latest: null as number | null,
			average: null as number | null,
			trimmedAverage: null as number | null,
		};
	}

	const latestRaw = validChecks[validChecks.length - 1]?.responseTime ?? null;
	const latest = latestRaw == null ? null : Math.floor(latestRaw);
	const average =
		Math.round(
			validChecks.reduce((sum, check) => sum + (check.responseTime ?? 0), 0) /
				validChecks.length
		) ?? null;

	const sortedResponseTimes = validChecks
		.map((check) => check.responseTime ?? 0)
		.sort((a, b) => a - b);
	const trimSize = Math.floor(sortedResponseTimes.length * 0.1);
	const trimmed =
		sortedResponseTimes.length > 2 * trimSize
			? sortedResponseTimes.slice(trimSize, sortedResponseTimes.length - trimSize)
			: sortedResponseTimes;
	const trimmedAverage =
		trimmed.length > 0
			? Math.round(trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length)
			: average;

	return { latest, average, trimmedAverage };
};

const getResponseThresholds = (checks: StatusPageMonitor["checks"]) => {
	const responseTimes =
		checks
			?.filter((check) => check.status === true)
			.map((check) => check.responseTime)
			.filter((value): value is number => typeof value === "number") ?? [];

	if (!responseTimes.length) {
		return { p75: 0, p95: 0 };
	}

	const sorted = [...responseTimes].sort((a, b) => a - b);
	const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1];
	const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];

	return { p75, p95 };
};

const resolveHeartbeatState = (
	check: MonitorCheck,
	thresholds: { p75: number; p95: number }
) => {
	if (!check.status) {
		return "offline" as const;
	}

	if (check.responseTime > thresholds.p95) {
		return "maintenance" as const;
	}

	if (check.responseTime > thresholds.p75) {
		return "pending" as const;
	}

	return "online" as const;
};

const UptimeRing = ({ monitor }: { monitor: StatusPageMonitor }) => {
	const theme = useTheme();
	const value = resolveUptimePercentage(monitor);
	const fill = getStatusColor(monitor.status, theme);

	const data = useMemo(() => [{ value, fill }], [value, fill]);

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: theme.spacing(2),
				padding: "6px",
				borderRadius: "12px",
				border: "1px solid",
				borderColor:
					theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
				backgroundColor:
					theme.palette.mode === "dark"
						? "rgba(255,255,255,0.02)"
						: "rgba(255,255,255,0.7)",
			}}
		>
			<Box sx={{ position: "relative", width: 40, height: 40 }}>
				<ResponsiveContainer
					width="100%"
					height="100%"
				>
					<RadialBarChart
						innerRadius="65%"
						outerRadius="100%"
						data={data}
						startAngle={90}
						endAngle={-270}
						barSize={12}
						cx="50%"
						cy="50%"
					>
						<PolarAngleAxis
							type="number"
							domain={[0, 100]}
							angleAxisId={0}
							tick={false}
						/>
						<RadialBar
							background
							dataKey="value"
							cornerRadius={30}
							fill={fill}
						/>
					</RadialBarChart>
				</ResponsiveContainer>
			</Box>
			<Typography
				variant="body2"
				sx={{ color: fill, fontWeight: 600, whiteSpace: "nowrap", fontSize: "14px" }}
			>
				{formatUptime(value)}
			</Typography>
		</Box>
	);
};

const AvailabilityStrip = ({ monitor }: { monitor: StatusPageMonitor }) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const checks = useMemo(() => monitor.checks?.slice().reverse() ?? [], [monitor.checks]);
	const targetVisibleBars = 100;

	// Keep latency stats focused on recent samples to avoid older checks skewing averages.
	const recentChecksForStats = useMemo(() => checks.slice(-50), [checks]);
	const visibleChecks = useMemo(
		() => checks.slice(-targetVisibleBars),
		[checks, targetVisibleBars]
	);

	const placeholders = useMemo(
		() =>
			Array.from(
				{ length: Math.max(0, targetVisibleBars - visibleChecks.length) },
				(_, index) => ({
					id: `placeholder-${monitor.id}-${index}`,
					status: null,
					responseTime: null,
					createdAt: "",
				})
			),
		[targetVisibleBars, visibleChecks.length, monitor.id]
	);

	const bars = useMemo(
		() => [...placeholders, ...visibleChecks],
		[placeholders, visibleChecks]
	);
	const stats = useMemo(
		() => getLatencyStats(recentChecksForStats),
		[recentChecksForStats]
	);
	const thresholds = useMemo(
		() => getResponseThresholds(recentChecksForStats),
		[recentChecksForStats]
	);

	const legendItems = [
		{
			key: "online",
			label: t("pages.common.monitors.status.up"),
			color: theme.palette.success.main,
		},
		{
			key: "pending",
			label: t("pages.common.monitors.status.initializing"),
			color: theme.palette.warning.main,
		},
		{
			key: "maintenance",
			label: t("pages.common.monitors.status.maintenance"),
			color: theme.palette.info.main,
		},
		{
			key: "offline",
			label: t("pages.common.monitors.status.down"),
			color: theme.palette.error.main,
		},
	] as const;

	const getBarColor = (bar: (typeof bars)[number]) => {
		if (bar.status == null) {
			return theme.palette.action.hover;
		}

		const state = resolveHeartbeatState(bar as MonitorCheck, thresholds);

		const color = legendItems.find((item) => item.key === state)?.color;
		return color ?? theme.palette.success.main;
	};

	const getTooltipLabel = (bar: (typeof bars)[number]) => {
		if (bar.status == null) {
			return t("pages.common.monitors.status.initializing");
		}

		const state = resolveHeartbeatState(bar as MonitorCheck, thresholds);

		if (state === "online") return t("pages.common.monitors.status.up");
		if (state === "pending") return t("pages.common.monitors.status.initializing");
		if (state === "maintenance") return t("pages.common.monitors.status.maintenance");
		return t("pages.common.monitors.status.down");
	};

	const heartbeatBlocks = useMemo(
		() =>
			bars.map((check, index) => ({
				key:
					check.createdAt && check.createdAt.length > 0
						? `${monitor.id}-${check.createdAt}`
						: `${monitor.id}-placeholder-${index}`,
				statusLabel: getTooltipLabel(check),
				color: getBarColor(check),
				opacity: check.status === null ? 0.35 : 0.95,
				responseTime: check.responseTime,
				createdAt: check.createdAt,
			})),
		[bars, monitor.id, thresholds, t, theme.palette]
	);

	return (
		<Box
			sx={{
				mt: theme.spacing(2),
				mb: theme.spacing(1),
				px: "12px",
				py: "8px",
				borderRadius: "12px",
				border: "1px solid",
				borderColor:
					theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
				backgroundColor: "#18181b",
			}}
		>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				sx={{
					mb: theme.spacing(1),
					gap: theme.spacing(1),
					color: "#ecedee",
				}}
			>
				<Stack
					direction="row"
					alignItems="center"
					gap={theme.spacing(0.8)}
					flexWrap="wrap"
				>
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", fontWeight: 500, fontSize: "12px" }}
					>
						Latest Ping:{" "}
						<Box
							component="span"
							sx={{ color: theme.palette.success.main, fontWeight: 700 }}
						>
							{stats.latest ?? "--"} ms
						</Box>
					</Typography>
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", fontWeight: 500, fontSize: "12px" }}
					>
						Average Ping:{" "}
						<Box
							component="span"
							sx={{ color: theme.palette.success.main, fontWeight: 700 }}
						>
							{stats.average ?? "--"} ms
						</Box>
					</Typography>
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", fontWeight: 500, fontSize: "12px" }}
					>
						Trimmed Average:{" "}
						<Box
							component="span"
							sx={{ color: theme.palette.success.main, fontWeight: 700 }}
						>
							{stats.trimmedAverage ?? "--"} ms
						</Box>
					</Typography>
				</Stack>
				<Stack
					direction="row"
					alignItems="center"
					gap={theme.spacing(5)}
					flexWrap="wrap"
					justifyContent="flex-end"
				>
					{legendItems.map((item) => (
						<Stack
							key={item.key}
							direction="row"
							alignItems="center"
							gap={theme.spacing(2)}
						>
							<Box
								sx={{
									width: 7,
									height: 7,
									borderRadius: "50%",
									backgroundColor: item.color,
								}}
							/>
							<Typography
								variant="caption"
								sx={{ opacity: 0.82, whiteSpace: "nowrap", fontSize: "12px" }}
							>
								{item.label}
							</Typography>
						</Stack>
					))}
				</Stack>
			</Stack>

			<Stack
				direction="row"
				alignItems="center"
				justifyContent="center"
				sx={{
					gap: { xs: theme.spacing(0.5), md: theme.spacing(1) },
					height: 14,
					width: "100%",
					mx: "auto",
					mt: theme.spacing(4),
					borderRadius: theme.spacing(0.6),
					overflow: "hidden",
				}}
			>
				{heartbeatBlocks.map((block) => (
					<Tooltip
						key={block.key}
						title={
							<Stack gap={0.2}>
								<Typography
									variant="caption"
									fontWeight={600}
								>
									{block.statusLabel}
									{typeof block.responseTime === "number"
										? ` - ${block.responseTime} ms`
										: ""}
								</Typography>
								{block.createdAt && (
									<Typography
										variant="caption"
										sx={{ opacity: 0.8 }}
									>
										{dayjs(block.createdAt).format("YYYY-MM-DD HH:mm:ss")}
									</Typography>
								)}
							</Stack>
						}
						arrow
					>
						<Box
							sx={{
								flex: 1,
								height: "100%",
								minWidth: { xs: 2.4, md: 3 },
								borderRadius: theme.spacing(0.2),
								cursor: "pointer",
								transition: "opacity 180ms ease",
								"&:hover": { opacity: 0.82 },
								backgroundColor: block.color,
								opacity: block.opacity,
							}}
						/>
					</Tooltip>
				))}
			</Stack>
		</Box>
	);
};

const MonitorHeader = ({
	monitor,
	statusPageUrl,
	showURL,
	showUptime,
}: {
	monitor: StatusPageMonitor;
	statusPageUrl: string;
	showURL: boolean;
	showUptime: boolean;
}) => {
	const theme = useTheme();
	const location = useLocation();
	const isPublic = location.pathname.startsWith("/status/public");
	const statusColor = getStatusColor(monitor.status, theme);
	const StatusIcon = getStatusIcon(monitor.status);
	const detailPath = `/status/public/${statusPageUrl}/${monitor.id}`;

	return (
		<Stack
			direction="row"
			alignItems="flex-start"
			justifyContent="space-between"
			gap={theme.spacing(1)}
			mb={theme.spacing(1.2)}
			sx={{
				padding: "20px",
			}}
		>
			<Box sx={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
				<Stack
					direction="row"
					alignItems="center"
					gap={theme.spacing(5)}
					mb={theme.spacing(0.6)}
				>
					<StatusIcon
						size={20}
						color={statusColor}
						style={{ minWidth: 20 }}
					/>
					<Typography
						variant="h3"
						sx={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							fontSize: { xs: "1.05rem", md: "20px" },
							fontWeight: 700,
						}}
					>
						{isPublic ? (
							<Link
								to={detailPath}
								style={{ color: "inherit", textDecoration: "none" }}
							>
								{monitor.name}
							</Link>
						) : (
							monitor.name
						)}
					</Typography>
					{/* <Typography
						variant="caption"
						sx={getMonitorBadgeStyles(monitor.type ?? "", theme)}
					>
						{getMonitorTypeLabel(monitor.type, t)}
					</Typography> */}
				</Stack>
				{showURL && monitor.url && (
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							fontSize: "0.82rem",
						}}
					>
						{monitor.url}
					</Typography>
				)}
			</Box>
			{showUptime ? (
				<UptimeRing monitor={monitor} />
			) : (
				<StatusLabel
					status={monitor.status}
					sx={{
						backgroundColor:
							theme.palette.mode === "dark"
								? "rgba(255,255,255,0.02)"
								: "rgba(255,255,255,0.7)",
						py: theme.spacing(1),
					}}
				/>
			)}
		</Stack>
	);
};

const MonitorContent = ({
	monitor,
	statusPage,
}: {
	monitor: StatusPageMonitor;
	statusPage: StatusPage;
}) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const [selectedRange, setSelectedRange] = useState<RangeKey>("50-points");

	const checks = useMemo(() => monitor.checks?.slice().reverse() ?? [], [monitor.checks]);

	const availableRanges = useMemo(
		() =>
			countRanges.filter((range) => range.key !== "100-points" || checks.length >= 100),
		[checks.length]
	);

	useEffect(() => {
		if (!availableRanges.some((range) => range.key === selectedRange)) {
			setSelectedRange(availableRanges[0]?.key ?? "10-points");
		}
	}, [availableRanges, selectedRange]);

	const handleRangeChange = useCallback((rangeKey: RangeKey) => {
		setSelectedRange(rangeKey);
	}, []);

	const filteredData = useMemo<LatencyChartPoint[]>(() => {
		const count =
			availableRanges.find((range) => range.key === selectedRange)?.count ?? 50;

		return checks
			.slice(-count)
			.filter(
				(check): check is MonitorCheck =>
					Boolean(check) &&
					typeof check.responseTime === "number" &&
					!Number.isNaN(check.responseTime) &&
					typeof check.createdAt === "string" &&
					dayjs(check.createdAt).isValid()
			)
			.map((check) => ({
				time: dayjs(check.createdAt).valueOf(),
				ping: check.responseTime,
				createdAt: check.createdAt ?? "",
			}));
	}, [availableRanges, checks, selectedRange]);

	const pings = useMemo(
		() =>
			filteredData
				.map((point) => point.ping)
				.filter((ping) => ping > 0 && !Number.isNaN(ping)),
		[filteredData]
	);
	const minPing = pings.length > 0 ? Math.max(0, Math.min(...pings) - 10) : 0;
	const maxPing = pings.length > 0 ? Math.max(...pings) + 10 : 100;

	const chartStroke =
		theme.palette.mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(25,30,48,0.14)";
	const labelColor =
		theme.palette.mode === "dark" ? "rgba(255,255,255,0.62)" : "rgba(19,33,62,0.72)";
	const gradientId = `monitor-gradient-${monitor.id}`;

	if (monitor.type === "hardware") {
		if (statusPage.showInfrastructure === false) return null;
		return <InfrastructureMetrics monitor={monitor} />;
	}

	if (statusPage.showCharts === false) return null;

	if (filteredData.length === 0) {
		return (
			<Box
				sx={{
					mt: theme.spacing(1),
					p: theme.spacing(2),
					borderRadius: "12px",
					background: "#18181b",
					border: "1px solid",
					borderColor:
						theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
				}}
			>
				<Typography
					variant="body2"
					color="text.secondary"
				>
					{t("pages.common.noData", "No chart data available.")}
				</Typography>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				overflow: "hidden",
				minWidth: 0,
				flex: 1,
				mt: theme.spacing(1),
				px: "12px",
				py: "8px",
				borderRadius: "12px",
				border: "1px solid",
				borderColor:
					theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
				background: "#18181b",
			}}
		>
			<Stack
				direction="row"
				justifyContent="center"
				sx={{ mb: theme.spacing(1.2) }}
			>
				<Stack
					direction="row"
					alignItems="center"
					sx={{
						p: theme.spacing(0.75),
						px: theme.spacing(1),
						gap: theme.spacing(0.55),
						borderRadius: "13px",
						minHeight: 40,
						border: "1px solid",
						borderColor:
							theme.palette.mode === "dark"
								? "rgba(255,255,255,0.07)"
								: "rgba(0,0,0,0.08)",
						backgroundColor:
							theme.palette.mode === "dark" ? "#242933" : "rgba(0,0,0,0.06)",
						width: "fit-content",
						maxWidth: "100%",
					}}
				>
					{availableRanges.map((range) => {
						const isActive = selectedRange === range.key;
						return (
							<Box
								key={range.key}
								component="button"
								onClick={() => handleRangeChange(range.key)}
								sx={{
									border: 0,
									cursor: "pointer",
									fontFamily: "inherit",
									lineHeight: 1.1,
									px: theme.spacing(2.2),
									py: theme.spacing(1.2),
									minHeight: 30,
									borderRadius: "10px",
									fontSize: "0.9rem",
									fontWeight: isActive ? 600 : 500,
									color: isActive ? "#f4f6fb" : "rgba(228,232,241,0.58)",
									backgroundColor: isActive
										? theme.palette.mode === "dark"
											? "#4f5563"
											: "rgba(0,0,0,0.14)"
										: "transparent",
									boxShadow: "none",
									transition: "all 140ms ease",
									"&:hover": {
										backgroundColor: isActive
											? theme.palette.mode === "dark"
												? "#4f5563"
												: "rgba(0,0,0,0.14)"
											: theme.palette.mode === "dark"
												? "rgba(255,255,255,0.06)"
												: "rgba(0,0,0,0.06)",
									},
									"&:focus-visible": {
										outline: `2px solid ${theme.palette.primary.main}`,
										outlineOffset: 1,
									},
								}}
							>
								{`Last ${range.count} times`}
							</Box>
						);
					})}
				</Stack>
			</Stack>

			<ResponsiveContainer
				width="100%"
				height={170}
			>
				<AreaChart
					data={filteredData}
					margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
				>
					<defs>
						<linearGradient
							id={gradientId}
							x1="0"
							x2="0"
							y1="0"
							y2="1"
						>
							<stop
								offset="10%"
								stopColor={theme.palette.success.main}
								stopOpacity={0.45}
							/>
							<stop
								offset="100%"
								stopColor={alpha(theme.palette.success.main, 0.15)}
								stopOpacity={0.08}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid
						stroke={chartStroke}
						strokeDasharray="3 3"
						vertical={false}
					/>
					<XAxis
						dataKey="time"
						type="number"
						scale="time"
						domain={["dataMin", "dataMax"]}
						tickFormatter={(time) => dayjs(time).format("HH:mm:ss")}
						axisLine={false}
						tickLine={false}
						minTickGap={30}
						interval="preserveStartEnd"
						tick={{ fill: labelColor, fontSize: 11 }}
					/>
					<YAxis
						tick={{ fill: labelColor, fontSize: 11 }}
						axisLine={false}
						tickLine={false}
						width={48}
						domain={[minPing, maxPing]}
						tickFormatter={(value) => `${Math.round(value)} ms`}
					/>
					<RechartsTooltip
						formatter={(value: number) => [`${Math.floor(value)} ms`, "Ping"]}
						labelFormatter={(value) => {
							if (typeof value !== "number") return "";
							return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
						}}
						cursor={{ strokeWidth: 0 }}
					/>
					<Area
						type="monotone"
						dataKey="ping"
						stroke={theme.palette.success.main}
						strokeWidth={2}
						fill={`url(#${gradientId})`}
						connectNulls
						activeDot={{
							stroke: theme.palette.success.main,
							strokeWidth: 2,
							fill: theme.palette.background.paper,
							r: 5,
						}}
						dot={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</Box>
	);
};

export const MonitorsList = ({ statusPage, monitors }: MonitorsListProps) => {
	const theme = useTheme();
	const showURL = useSelector((state: RootState) => state.ui?.showURL);

	return (
		<Stack gap={theme.spacing(10)}>
			{monitors.map((monitor) => (
				<BaseBox
					key={monitor.id}
					sx={{
						p: theme.spacing(2),
						borderRadius: theme.spacing(16),
						borderColor:
							theme.palette.mode === "dark"
								? "rgba(255,255,255,0.14)"
								: "rgba(0,0,0,0.08)",
						background: "#18181b",
						boxShadow:
							theme.palette.mode === "dark"
								? "0 10px 30px rgba(0,0,0,0.26)"
								: "0 8px 24px rgba(24,39,75,0.08)",
					}}
				>
					<MonitorHeader
						monitor={monitor}
						statusPageUrl={statusPage.url}
						showURL={showURL}
						showUptime={statusPage.showUptimePercentage}
					/>
					<Stack
						sx={{
							p: "20px",
							pt: "4px",
							gap: theme.spacing(10),
						}}
					>
						{monitor.type !== "hardware" && statusPage.showCharts && (
							<AvailabilityStrip monitor={monitor} />
						)}
						<Divider />
						<MonitorContent
							monitor={monitor}
							statusPage={statusPage}
						/>
					</Stack>
				</BaseBox>
			))}
		</Stack>
	);
};
