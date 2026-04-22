import { BaseBox, BaseFallback, BasePage } from "@/Components/design-elements";
import { useGet } from "@/Hooks/UseApi";
import { useIsAdmin } from "@/Hooks/useIsAdmin";
import { HeaderStatusPageControls } from "@/Pages/StatusPage/Status/Components/HeaderStatusPageControls";
import { MonitorsList } from "@/Pages/StatusPage/Status/Components/MonitorsList";
import type { PublicMonitorDetailResponse } from "@/Types/StatusPage";
import {
	Box,
	Chip,
	Divider,
	Grid,
	Stack,
	Typography,
	useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

const formatMetric = (value: number | null, suffix: string) => {
	if (value == null || Number.isNaN(value)) return "--";
	return `${value}${suffix}`;
};

const formatUptime = (value: number) =>
	`${Math.max(0, Math.min(100, value)).toFixed(2)}%`;

const getRiskColor = (risk: "Low" | "Medium" | "High") => {
	if (risk === "Low") return "success" as const;
	if (risk === "Medium") return "warning" as const;
	return "error" as const;
};

const PublicMonitorDetailsPage = () => {
	const theme = useTheme();
	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const isAdmin = useIsAdmin();
	const { url, monitorId } = useParams();
	const apiUrl = url && monitorId ? `/status-page/${url}/monitor/${monitorId}` : null;

	const { data, isLoading, error } = useGet<PublicMonitorDetailResponse>(
		apiUrl,
		{},
		{ refreshInterval: 10000 }
	);

	const statusPage = data?.statusPage;
	const monitor = data?.monitor;
	const summary = data?.summary;

	const lastCheckText = useMemo(() => {
		if (!summary?.lastCheckAt) return "No check data yet";
		return dayjs(summary.lastCheckAt).format("YYYY-MM-DD HH:mm:ss");
	}, [summary?.lastCheckAt]);

	const logoSrc = statusPage?.logo?.data
		? `data:${statusPage.logo.contentType};base64,${statusPage.logo.data}`
		: null;

	const contentPadding = {
		paddingTop: theme.spacing(20),
		paddingLeft: isSmall ? "5vw" : "20vw",
		paddingRight: isSmall ? "5vw" : "20vw",
	};

	if (!statusPage || !monitor || !summary) {
		return (
			<BasePage
				loading={isLoading}
				error={error}
				sx={contentPadding}
				breadcrumbOverride={[]}
			>
				<BaseFallback>
					<Typography variant="h2">Monitor Not Found</Typography>
					<Typography
						variant="body1"
						color="text.secondary"
					>
						This monitor is unavailable or is not part of this public status page.
					</Typography>
				</BaseFallback>
			</BasePage>
		);
	}

	const riskColor = getRiskColor(summary.risk);

	return (
		<BasePage
			loading={isLoading}
			error={error}
			sx={contentPadding}
			breadcrumbOverride={[]}
		>
			<HeaderStatusPageControls
				isAdmin={isAdmin}
				statusPage={statusPage}
				isPublic
			/>

			{logoSrc && (
				<Box
					component="img"
					src={logoSrc}
					alignSelf="flex-start"
					alt={statusPage.companyName}
					sx={{
						maxHeight: 120,
						maxWidth: "100%",
						objectFit: "contain",
						mb: 2,
					}}
				/>
			)}

			<MonitorsList
				statusPage={statusPage}
				monitors={[monitor]}
			/>

			<Grid
				container
				spacing={3}
				sx={{ mt: 2 }}
			>
				<Grid size={{ xs: 12, md: 8 }}>
					<BaseBox
						sx={{
							p: 3,
							borderRadius: 4,
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
						}}
					>
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="flex-start"
						>
							<Box>
								<Typography variant="h4">Service Overview</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mt: 1 }}
								>
									A descriptive summary of this monitor based on current uptime and
									heartbeat behavior.
								</Typography>
							</Box>
							<Stack
								direction="row"
								spacing={1}
							>
								<Chip
									label={monitor.status === "up" ? "Online" : monitor.status}
									color={monitor.status === "up" ? "success" : "default"}
								/>
								<Chip
									label={`Risk: ${summary.risk}`}
									color={riskColor}
									variant="outlined"
								/>
							</Stack>
						</Stack>

						<Stack
							spacing={1.5}
							sx={{ mt: 2.5 }}
						>
							<Typography variant="body1">
								This service is healthy and responding normally based on the latest
								heartbeat.
							</Typography>
							<Typography variant="body1">
								{monitor.name} is configured as a {monitor.type} monitor.
							</Typography>
							<Typography variant="body1">
								Last check: {lastCheckText}. Last {summary.recentTimeline.windowSize}{" "}
								checks include {summary.recentTimeline.incidents} degraded events and{" "}
								{summary.recentTimeline.healthy} healthy events.
							</Typography>
							<Typography variant="body1">
								Latency is stable with no meaningful drift in recent checks.
							</Typography>
						</Stack>
					</BaseBox>
				</Grid>

				<Grid size={{ xs: 12, md: 4 }}>
					<BaseBox
						sx={{
							p: 3,
							borderRadius: 4,
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
							height: "100%",
						}}
					>
						<Typography variant="h4">Key Metrics</Typography>
						<Stack
							divider={<Divider />}
							sx={{ mt: 2 }}
						>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography>24h Uptime</Typography>
								<Chip
									label={formatUptime(summary.uptimePercentage)}
									color="secondary"
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography>SLA Tier</Typography>
								<Chip
									label={summary.slaTier}
									color="secondary"
									variant="outlined"
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography>Latest Latency</Typography>
								<Chip
									label={formatMetric(summary.latency.latest, " ms")}
									color="success"
									variant="outlined"
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography>Average Latency</Typography>
								<Chip
									label={formatMetric(summary.latency.average, " ms")}
									color="success"
									variant="outlined"
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography>Trimmed Average</Typography>
								<Chip
									label={formatMetric(summary.latency.trimmedAverage, " ms")}
									color="success"
									variant="outlined"
								/>
							</Stack>
						</Stack>
					</BaseBox>
				</Grid>

				<Grid size={{ xs: 12, md: 6 }}>
					<BaseBox
						sx={{
							p: 3,
							borderRadius: 4,
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
							height: "100%",
						}}
					>
						<Typography variant="h4">Endpoint Details</Typography>
						<Stack
							spacing={1.3}
							sx={{ mt: 2.5 }}
						>
							<Typography color="text.secondary">Monitor Name</Typography>
							<Typography variant="h6">{monitor.name}</Typography>
							<Typography color="text.secondary">Monitor Type</Typography>
							<Typography variant="h6">{monitor.type}</Typography>
							<Typography color="text.secondary">Target</Typography>
							<Typography variant="h6">
								{monitor.url ?? "Not provided for this monitor type"}
							</Typography>
							<Typography color="text.secondary">Tags</Typography>
							<Typography variant="h6">{monitor.group ?? "No tags assigned"}</Typography>
						</Stack>
					</BaseBox>
				</Grid>

				<Grid size={{ xs: 12, md: 6 }}>
					<BaseBox
						sx={{
							p: 3,
							borderRadius: 4,
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
							height: "100%",
						}}
					>
						<Typography variant="h4">Recent Timeline Summary</Typography>
						<Typography
							variant="body1"
							sx={{ mt: 2 }}
						>
							This panel summarizes the most recent {summary.recentTimeline.windowSize}{" "}
							heartbeat checks so incidents and instability are easier to spot quickly.
						</Typography>

						<BaseBox
							sx={{
								mt: 2.5,
								p: 2,
								borderRadius: 3,
								background: "rgba(255,255,255,0.02)",
							}}
						>
							<Stack
								direction="row"
								justifyContent="space-between"
								alignItems="center"
							>
								<Typography
									variant="caption"
									sx={{ letterSpacing: 1.1 }}
								>
									SERVICE RELIABILITY RISK
								</Typography>
								<Chip
									label={summary.risk}
									color={riskColor}
								/>
							</Stack>
							<Typography
								variant="body1"
								sx={{ mt: 1 }}
							>
								Behavior is consistently stable with {summary.risk.toLowerCase()}{" "}
								short-term reliability risk.
							</Typography>
						</BaseBox>

						<Grid
							container
							spacing={1.5}
							sx={{ mt: 0.5 }}
						>
							<Grid size={{ xs: 6 }}>
								<BaseBox
									sx={{
										p: 2,
										borderRadius: 3,
										border: "1px solid",
										borderColor: "success.main",
										background: "rgba(34,197,94,0.08)",
									}}
								>
									<Typography color="text.secondary">Healthy</Typography>
									<Typography variant="h4">{summary.recentTimeline.healthy}</Typography>
								</BaseBox>
							</Grid>
							<Grid size={{ xs: 6 }}>
								<BaseBox
									sx={{
										p: 2,
										borderRadius: 3,
										border: "1px solid",
										borderColor: "error.main",
										background: "rgba(239,68,68,0.08)",
									}}
								>
									<Typography color="text.secondary">Down</Typography>
									<Typography variant="h4">{summary.recentTimeline.down}</Typography>
								</BaseBox>
							</Grid>
							<Grid size={{ xs: 6 }}>
								<BaseBox
									sx={{
										p: 2,
										borderRadius: 3,
										border: "1px solid",
										borderColor: "warning.main",
										background: "rgba(245,158,11,0.08)",
									}}
								>
									<Typography color="text.secondary">Pending</Typography>
									<Typography variant="h4">{summary.recentTimeline.pending}</Typography>
								</BaseBox>
							</Grid>
							<Grid size={{ xs: 6 }}>
								<BaseBox
									sx={{
										p: 2,
										borderRadius: 3,
										border: "1px solid",
										borderColor: "info.main",
										background: "rgba(59,130,246,0.08)",
									}}
								>
									<Typography color="text.secondary">Maintenance</Typography>
									<Typography variant="h4">
										{summary.recentTimeline.maintenance}
									</Typography>
								</BaseBox>
							</Grid>
						</Grid>
					</BaseBox>
				</Grid>
			</Grid>
		</BasePage>
	);
};

export default PublicMonitorDetailsPage;
