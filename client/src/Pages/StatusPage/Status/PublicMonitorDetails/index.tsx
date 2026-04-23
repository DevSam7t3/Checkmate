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
import { useMemo, useState } from "react";
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
	const [searchValue, setSearchValue] = useState("");
	const { url, monitorId } = useParams();
	const apiUrl = url && monitorId ? `/status-page/${url}/monitor/${monitorId}` : null;

	const { data, isLoading, error, refetch } = useGet<PublicMonitorDetailResponse>(apiUrl);

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
		background: "#000000",
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

	const filteredMonitor =
		searchValue.trim().length > 0 &&
		!monitor.name?.toLowerCase().includes(searchValue.trim().toLowerCase())
			? []
			: [monitor];

	const riskColor = getRiskColor(summary.risk);
	const cardTitleSx = {
		fontSize: "1.125rem",
		fontWeight: 600,
		lineHeight: 1.3,
		letterSpacing: "-0.01em",
	};
	const sectionDescriptionSx = {
		mt: 1,
		fontSize: "0.875rem",
		lineHeight: 1.45,
		color: "text.secondary",
	};
	const bodyCopySx = {
		fontSize: "0.875rem",
		lineHeight: 1.7,
		color: "text.secondary",
	};
	const metricLabelSx = {
		fontSize: "0.875rem",
		lineHeight: 1.5,
		color: "text.secondary",
	};
	const endpointLabelSx = {
		fontSize: "0.75rem",
		lineHeight: 1.3,
		color: "text.secondary",
	};
	const endpointValueSx = {
		fontSize: "1rem",
		fontWeight: 500,
		lineHeight: 1.4,
	};

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
				onSearchChange={setSearchValue}
				onRefreshNow={refetch}
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
				monitors={filteredMonitor}
			/>

			<Grid
				container
				spacing={8}
				alignItems="stretch"
				sx={{ mt: 2 }}
			>
				<Grid
					size={{ xs: 12, md: 8 }}
					sx={{ display: "flex" }}
				>
					<BaseBox
						sx={{
							borderRadius: 8,
							width: "100%",
							height: "100%",
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
							sx={{
								p: "20px",
								pb: "12px",
							}}
						>
							<Box>
								<Typography sx={cardTitleSx}>Service Overview</Typography>
								<Typography sx={sectionDescriptionSx}>
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
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 500 } }}
								/>
								<Chip
									label={`Risk: ${summary.risk}`}
									color={riskColor}
									variant="outlined"
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 500 } }}
								/>
							</Stack>
						</Stack>

						<Stack
							spacing={1.5}
							sx={{
								mt: 2.5,
								p: "20px",
								pt: "8px",
							}}
						>
							<Typography sx={bodyCopySx}>
								This service is healthy and responding normally based on the latest
								heartbeat.
							</Typography>
							<Typography sx={bodyCopySx}>
								{monitor.name} is configured as a {monitor.type} monitor.
							</Typography>
							<Typography sx={bodyCopySx}>
								Last check: {lastCheckText}. Last {summary.recentTimeline.windowSize}{" "}
								checks include {summary.recentTimeline.incidents} degraded events and{" "}
								{summary.recentTimeline.healthy} healthy events.
							</Typography>
							<Typography sx={bodyCopySx}>
								Latency is stable with no meaningful drift in recent checks.
							</Typography>
						</Stack>
					</BaseBox>
				</Grid>

				<Grid
					size={{ xs: 12, md: 4 }}
					sx={{ display: "flex" }}
				>
					<BaseBox
						sx={{
							p: "20px",
							borderRadius: 8,
							width: "100%",
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
							height: "100%",
						}}
					>
						<Typography sx={cardTitleSx}>Key Metrics</Typography>
						<Stack
							divider={<Divider />}
							sx={{ mt: 2 }}
						>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography sx={metricLabelSx}>24h Uptime</Typography>
								<Chip
									label={formatUptime(summary.uptimePercentage)}
									color="secondary"
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 600 } }}
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography sx={metricLabelSx}>SLA Tier</Typography>
								<Chip
									label={summary.slaTier}
									color="secondary"
									variant="outlined"
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 600 } }}
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography sx={metricLabelSx}>Latest Latency</Typography>
								<Chip
									label={formatMetric(summary.latency.latest, " ms")}
									color="success"
									variant="outlined"
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 600 } }}
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography sx={metricLabelSx}>Average Latency</Typography>
								<Chip
									label={formatMetric(summary.latency.average, " ms")}
									color="success"
									variant="outlined"
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 600 } }}
								/>
							</Stack>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography sx={metricLabelSx}>Trimmed Average</Typography>
								<Chip
									label={formatMetric(summary.latency.trimmedAverage, " ms")}
									color="success"
									variant="outlined"
									size="small"
									sx={{ "& .MuiChip-label": { fontWeight: 600 } }}
								/>
							</Stack>
						</Stack>
					</BaseBox>
				</Grid>

				<Grid
					size={{ xs: 12, md: 6 }}
					sx={{ display: "flex" }}
				>
					<BaseBox
						sx={{
							borderRadius: 4,
							width: "100%",
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
							height: "100%",
						}}
					>
						<Typography
							sx={{
								...cardTitleSx,
								p: 10,
								pb: 6,
							}}
						>
							Endpoint Details
						</Typography>
						<Stack
							spacing={0}
							sx={{
								mt: 2.5,
								p: 10,
								pt: 2,
							}}
						>
							<Typography sx={endpointLabelSx}>Monitor Name</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									mb: 5,
								}}
							>
								{monitor.name}
							</Typography>
							<Typography sx={endpointLabelSx}>Monitor Type</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									mb: 5,
								}}
							>
								{monitor.type}
							</Typography>
							<Typography sx={endpointLabelSx}>Target</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									wordBreak: "break-all",
									mb: 5,
								}}
							>
								{monitor.url ?? "Not provided for this monitor type"}
							</Typography>
							<Typography sx={endpointLabelSx}>Tags</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									mb: 5,
								}}
							>
								{monitor.group ?? "No tags assigned"}
							</Typography>
						</Stack>
					</BaseBox>
				</Grid>

				<Grid
					size={{ xs: 12, md: 6 }}
					sx={{ display: "flex" }}
				>
					<BaseBox
						sx={{
							p: 3,
							borderRadius: 4,
							width: "100%",
							borderColor:
								theme.palette.mode === "dark"
									? "rgba(255,255,255,0.14)"
									: "rgba(0,0,0,0.08)",
							background: "#18181b",
							height: "100%",
						}}
					>
						<Typography
							sx={{
								...cardTitleSx,
								p: 10,
								pb: 6,
							}}
						>
							Recent Timeline Summary
						</Typography>

						<Stack
							sx={{
								p: 10,
								pt: 2,
							}}
							gap={8}
						>
							<Typography sx={{ ...bodyCopySx, mt: 2 }}>
								This panel summarizes the most recent {summary.recentTimeline.windowSize}{" "}
								heartbeat checks so incidents and instability are easier to spot quickly.
							</Typography>
							<BaseBox
								sx={{
									mt: 2.5,
									px: 6,
									py: 4,
									borderRadius: 3,
									background: "rgba(255,255,255,0.02)",
								}}
							>
								<Stack
									direction="row"
									justifyContent="space-between"
									alignItems="center"
									spacing={2.5}
								>
									<Typography
										sx={{
											fontSize: "0.75rem",
											textTransform: "uppercase",
											letterSpacing: "0.06em",
											color: "text.secondary",
										}}
									>
										SERVICE RELIABILITY RISK
									</Typography>
									<Chip
										label={summary.risk}
										color={riskColor}
										size="small"
										sx={{ "& .MuiChip-label": { fontWeight: 500 } }}
									/>
								</Stack>
								<Typography sx={{ ...bodyCopySx, mt: 1 }}>
									Behavior is consistently stable with {summary.risk.toLowerCase()}{" "}
									short-term reliability risk.
								</Typography>
							</BaseBox>

							<Grid
								container
								spacing={7}
								sx={{ mt: 0.5 }}
							>
								<Grid size={{ xs: 6 }}>
									<BaseBox
										sx={{
											p: 6,
											borderRadius: 6,
											border: "1px solid",
											borderColor: "success.main",
											background: "rgba(34,197,94,0.08)",
										}}
									>
										<Typography sx={endpointLabelSx}>Healthy</Typography>
										<Typography
											sx={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 }}
										>
											{summary.recentTimeline.healthy}
										</Typography>
									</BaseBox>
								</Grid>
								<Grid size={{ xs: 6 }}>
									<BaseBox
										sx={{
											p: 6,
											borderRadius: 6,
											border: "1px solid",
											borderColor: "error.main",
											background: "rgba(239,68,68,0.08)",
										}}
									>
										<Typography sx={endpointLabelSx}>Down</Typography>
										<Typography
											sx={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 }}
										>
											{summary.recentTimeline.down}
										</Typography>
									</BaseBox>
								</Grid>
								<Grid size={{ xs: 6 }}>
									<BaseBox
										sx={{
											p: 6,
											borderRadius: 6,
											border: "1px solid",
											borderColor: "warning.main",
											background: "rgba(245,158,11,0.08)",
										}}
									>
										<Typography sx={endpointLabelSx}>Pending</Typography>
										<Typography
											sx={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 }}
										>
											{summary.recentTimeline.pending}
										</Typography>
									</BaseBox>
								</Grid>
								<Grid size={{ xs: 6 }}>
									<BaseBox
										sx={{
											p: 6,
											borderRadius: 6,
											border: "1px solid",
											borderColor: "info.main",
											background: "rgba(59,130,246,0.08)",
										}}
									>
										<Typography sx={endpointLabelSx}>Maintenance</Typography>
										<Typography
											sx={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 }}
										>
											{summary.recentTimeline.maintenance}
										</Typography>
									</BaseBox>
								</Grid>
							</Grid>
						</Stack>
					</BaseBox>
				</Grid>
			</Grid>
		</BasePage>
	);
};

export default PublicMonitorDetailsPage;
