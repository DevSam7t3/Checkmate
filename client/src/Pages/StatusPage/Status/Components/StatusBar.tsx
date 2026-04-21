import {
	AlertTriangle,
	CircleCheck,
	CircleX,
	Loader,
	PauseCircle,
	ShieldAlert,
	Wrench,
	type LucideIcon,
} from "lucide-react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useTranslation } from "react-i18next";
import { Box, useTheme } from "@mui/material";
import type { Theme } from "@mui/material";
import type { Monitor, MonitorStatus } from "@/Types/Monitor";
import { useEffect, useState } from "react";
import { cn } from "@/Utils/cn";

interface StatusDisplay {
	icon: LucideIcon;
	msg?: string;
	color?: string;
	bgColor?: string;
}

const getMonitorStatus = (monitors: Monitor[], theme: Theme, t: Function) => {
	const monitorsStatus: StatusDisplay = {
		icon: AlertTriangle,
	};

	// Handle empty monitors array
	if (monitors.length === 0) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.noMonitors");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.icon = CircleX;
		return monitorsStatus;
	}

	const allOf = (...statuses: MonitorStatus[]) =>
		monitors.every((m) => statuses.includes(m.status));
	const someOf = (...statuses: MonitorStatus[]) =>
		monitors.some((m) => statuses.includes(m.status));
	const noneOf = (...statuses: MonitorStatus[]) =>
		monitors.every((m) => !statuses.includes(m.status));

	// All monitors in a single state
	if (allOf("up")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.allUp");
		monitorsStatus.color = theme.palette.success.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #68D391, #48BB78)"; // Tailwind's green-400 to green-600
		monitorsStatus.icon = CircleCheck;
	} else if (allOf("breached")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.allBreached");
		monitorsStatus.color = theme.palette.error.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = ShieldAlert;
	} else if (allOf("maintenance")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.allMaintenance");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #63B3ED, #4299E1)"; // Tailwind's blue-400 to blue-600
		monitorsStatus.icon = Wrench;
	} else if (allOf("down")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.allDown");
		monitorsStatus.color = theme.palette.error.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = CircleX;
	} else if (allOf("paused")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.allPaused");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = PauseCircle;
	} else if (allOf("initializing")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.allInitializing");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #63B3ED, #4299E1)"; // Tailwind's blue-400 to blue-600
		monitorsStatus.icon = Loader;

		// Breached takes highest priority in mixed states
	} else if (someOf("breached") && someOf("down")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.breachedAndDown");
		monitorsStatus.color = theme.palette.error.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = ShieldAlert;
	} else if (someOf("breached")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.breached");
		monitorsStatus.color = theme.palette.error.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = ShieldAlert;

		// Maintenance combinations
	} else if (someOf("maintenance") && someOf("down")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.maintenanceAndDown");
		monitorsStatus.color = theme.palette.error.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = Wrench;
	} else if (someOf("maintenance") && noneOf("down")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.maintenance");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = Wrench;

		// Degraded (some down, no maintenance/breached)
	} else if (someOf("down")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.degraded");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = AlertTriangle;

		// Some Paused
	} else if (someOf("paused")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.partiallyPaused");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #F6E05E, #D69E2E)"; // Tailwind's amber-400 to amber-600
		monitorsStatus.icon = PauseCircle;

		// Initializing
	} else if (someOf("initializing")) {
		monitorsStatus.msg = t("pages.statusPages.statusBar.initializing");
		monitorsStatus.color = theme.palette.info.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #63B3ED, #4299E1)"; // Tailwind's blue-400 to blue-600
		monitorsStatus.icon = Loader;
	} else {
		monitorsStatus.msg = t("pages.statusPages.statusBar.unknown");
		monitorsStatus.color = theme.palette.warning.main;
		monitorsStatus.bgColor = "linear-gradient(to right, #63B3ED, #4299E1)"; // Tailwind's blue-400 to blue-600
	}

	return monitorsStatus;
};

const pingAnimation = {
	animation: "slowPing 3s cubic-bezier(0,0,0.2,1) infinite",
} as const;

interface StatusBarProps {
	monitors: Monitor[];
}

export const StatusBar = ({ monitors }: StatusBarProps) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const monitorsStatus = getMonitorStatus(monitors, theme, t);
	const totalMonitors = monitors.length;
	const runningMonitors = monitors.filter((m) => m.status === "up").length;

	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => {
			setAnimate(true);
			setTimeout(() => setAnimate(false), 1000);
		}, 1000);

		setAnimate(true);
		setTimeout(() => setAnimate(false), 1000);

		return () => clearInterval(interval);
	}, []);

	const getStatusIcon = () => {
		const Icon = monitorsStatus.icon;

		return (
			<Icon
				className={`w-6 h-6 text-white transition-transform ${animate ? "scale-110" : ""}`}
				aria-hidden="true"
			/>
		);
	};

	return (
		<Box
			sx={{
				position: "relative",
				overflow: "hidden",
				width: "100%",
				py: { xs: 3, md: 10 },
				px: { xs: 4, md: 10 },
				borderRadius: "16px",
				boxShadow: 6,
				mx: "auto",
				my: 4,
				background: monitorsStatus.bgColor,
			}}
		>
			{/* Decorative Background */}
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					overflow: "hidden",
					pointerEvents: "none",
				}}
			>
				<Box
					sx={{
						position: "absolute",
						top: 0,
						right: 0,
						width: 256,
						height: 256,
						mt: "-128px",
						mr: "-128px",
						borderRadius: "50%",
						background: "rgba(255,255,255,0.05)",
					}}
				/>
				<Box
					sx={{
						position: "absolute",
						bottom: 0,
						left: 0,
						width: 192,
						height: 192,
						mb: "-96px",
						ml: "-96px",
						borderRadius: "50%",
						background: "rgba(0,0,0,0.05)",
					}}
				/>
			</Box>

			{/* Content */}
			<Box sx={{ maxWidth: "1280px", mx: "auto" }}>
				<Box
					sx={{
						display: "flex",
						flexDirection: "column",
						alignItems: { xs: "center", md: "flex-start" },
					}}
				>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							position: "relative",
							zIndex: 10,
							animation: animate ? "pulse 1.5s infinite" : "none",
							"@keyframes pulse": {
								"0%": { opacity: 1 },
								"50%": { opacity: 0.6 },
								"100%": { opacity: 1 },
							},
						}}
					>
						{/* Icon Wrapper */}
						<Box sx={{ position: "relative" }}>
							{/* Ping Animation */}
							<Box
								sx={{
									position: "absolute",
									inset: "-16px",
									borderRadius: "50%",
									background: "rgba(255,255,255,0.2)",
									zIndex: -1,
									...pingAnimation,
								}}
							/>

							{/* Icon */}
							<Box
								sx={{
									borderRadius: "50%",
									p: 1.5,
									mr: 3,
									background: "rgba(255,255,255,0.3)",
									backdropFilter: "blur(6px)",
									transition: "all 0.3s ease",
									position: "relative",
									zIndex: 10,
								}}
							>
								{getStatusIcon()}
							</Box>
						</Box>

						{/* Text */}
						<Typography
							sx={{
								color: "#fff",
								fontWeight: "bold",
								fontSize: { xs: "1.25rem", md: "1.25rem" },
								letterSpacing: "0.5px",
							}}
						>
							{monitorsStatus.msg}
							<Box
								component="span"
								sx={{
									color: "rgba(255,255,255,0.9)",
									fontSize: { xs: "0.875rem", md: "1rem" },
									ml: 1,
								}}
							>
								({runningMonitors}/{totalMonitors})
							</Box>
						</Typography>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};
