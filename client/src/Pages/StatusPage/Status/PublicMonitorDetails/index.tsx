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
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import IncidentDetails, { type Incident } from "../Components/IncidentCard";

type IncidentResponse = {
	incidents: Incident[];
};

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
	const { t } = useTranslation();

	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const isAdmin = useIsAdmin();
	const [searchValue, setSearchValue] = useState("");
	const { url, monitorId } = useParams();
	const apiUrl = url && monitorId ? `/status-page/${url}/monitor/${monitorId}` : null;

	const { data, isLoading, error, refetch } = useGet<PublicMonitorDetailResponse>(apiUrl);

	const statusPage = data?.statusPage;
	const monitor = data?.monitor;
	const summary = data?.summary;

	const {
		data: incidentsData,
		error: incidentError,
		isLoading: incidentsLoading,
	} = useSWR<IncidentResponse>(
		monitor?.name
			? `http://10.10.10.184:8000/status/incidents/${monitor?.name}/?limit=3`
			: null,
		(url: any) => {
			const res = fetch(url).then((res) => res.json());
			return res;
		}
	);

	const lastCheckText = () => {
		if (!summary?.lastCheckAt)
			return t(
				"pages.statusPage.publicMonitorDetails.lastCheckUnavailable",
				"No check data yet"
			);
		return t("pages.statusPage.publicMonitorDetails.lastCheck", "Last check: {{time}}", {
			time: dayjs(summary.lastCheckAt).format("YYYY-MM-DD HH:mm:ss"),
		});
	};

	const lastReports = () => {
		const fallback = `Last {{windowSize}} checks include {{incidents}} degraded events and {{health}} healthy events.`;

		return t("pages.statusPage.publicMonitorDetails.lastReport", fallback, {
			windowSize: summary?.recentTimeline?.windowSize || 0,
			incidents: summary?.recentTimeline?.incidents || 0,
			health: summary?.recentTimeline?.healthy || 0,
		});
	};

	const logoSrc = statusPage?.logo?.data
		? `data:${statusPage.logo.contentType};base64,${statusPage.logo.data}`
		: null;

	const contentPadding = {
		paddingTop: theme.spacing(20),
		paddingBottom: theme.spacing(20),
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
				isDetailsPage={true}
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
								<Typography sx={cardTitleSx}>
									{t("pages.statusPage.publicMonitorDetails.serviceOverview")}
								</Typography>
								<Typography sx={sectionDescriptionSx}>
									{t("pages.statusPage.publicMonitorDetails.serviceDescription")}
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
								{t("pages.statusPage.publicMonitorDetails.serviceHealthReport")}
							</Typography>
							<Typography sx={bodyCopySx}>
								{t("pages.statusPage.publicMonitorDetails.monitorType", {
									name: monitor.name,
									type: monitor.type,
								})}
							</Typography>
							<Typography sx={bodyCopySx}>
								{lastCheckText()}. {lastReports()}
							</Typography>
							<Typography sx={bodyCopySx}>
								{t("pages.statusPage.publicMonitorDetails.latencyReport")}
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
						<Typography sx={cardTitleSx}>
							{t("pages.statusPage.publicMonitorDetails.metrics.title")}
						</Typography>
						<Stack
							divider={<Divider />}
							sx={{ mt: 2 }}
						>
							<Stack
								direction="row"
								justifyContent="space-between"
								py={1.2}
							>
								<Typography sx={metricLabelSx}>
									24h {t("pages.statusPage.publicMonitorDetails.metrics.uptime")}
								</Typography>
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
								<Typography sx={metricLabelSx}>
									{t("pages.statusPage.publicMonitorDetails.metrics.slaTier")}
								</Typography>
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
								<Typography sx={metricLabelSx}>
									{t("pages.statusPage.publicMonitorDetails.metrics.latestLatency")}
								</Typography>
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
								<Typography sx={metricLabelSx}>
									{t("pages.statusPage.publicMonitorDetails.metrics.averageLatency")}
								</Typography>
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
								<Typography sx={metricLabelSx}>
									{t("pages.statusPage.publicMonitorDetails.metrics.trimmedAverage")}
								</Typography>
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
							{t("pages.statusPage.publicMonitorDetails.endpoint.title")}
						</Typography>
						<Stack
							spacing={0}
							sx={{
								mt: 2.5,
								p: 10,
								pt: 2,
							}}
						>
							<Typography sx={endpointLabelSx}>
								{t("pages.statusPage.publicMonitorDetails.endpoint.monitorName")}
							</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									mb: 5,
								}}
							>
								{monitor.name}
							</Typography>
							<Typography sx={endpointLabelSx}>
								{t("pages.statusPage.publicMonitorDetails.endpoint.monitorType")}
							</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									mb: 5,
								}}
							>
								{monitor.type}
							</Typography>
							<Typography sx={endpointLabelSx}>
								{t("pages.statusPage.publicMonitorDetails.endpoint.target")}
							</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									wordBreak: "break-all",
									mb: 5,
								}}
							>
								{monitor.url ??
									t("pages.statusPage.publicMonitorDetails.endpoint.noTarget")}
							</Typography>
							<Typography sx={endpointLabelSx}>
								{t("pages.statusPage.publicMonitorDetails.endpoint.tags")}
							</Typography>
							<Typography
								sx={{
									...endpointValueSx,
									mb: 5,
								}}
							>
								{monitor.group ??
									t("pages.statusPage.publicMonitorDetails.endpoint.noTags")}
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
							{t("pages.statusPage.publicMonitorDetails.timeline.title")}
						</Typography>

						<Stack
							sx={{
								p: 10,
								pt: 2,
							}}
							gap={8}
						>
							<Typography sx={{ ...bodyCopySx, mt: 2 }}>
								{t("pages.statusPage.publicMonitorDetails.timeline.description", {
									windowSize: summary.recentTimeline.windowSize,
								})}
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
										{t("pages.statusPage.publicMonitorDetails.timeline.risk.title")}
									</Typography>
									<Chip
										label={t(
											"pages.statusPage.publicMonitorDetails.timeline.risk." +
												summary.risk.toLowerCase(),
											summary.risk
										)}
										color={riskColor}
										size="small"
										sx={{ "& .MuiChip-label": { fontWeight: 500 } }}
									/>
								</Stack>
								<Typography sx={{ ...bodyCopySx, mt: 1 }}>
									{t("pages.statusPage.publicMonitorDetails.timeline.risk.description", {
										risk: t(
											"pages.statusPage.publicMonitorDetails.timeline.risk." +
												summary.risk.toLowerCase(),
											summary.risk
										),
									})}
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
										<Typography sx={endpointLabelSx}>
											{t("pages.statusPage.publicMonitorDetails.timeline.healthy")}
										</Typography>
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
										<Typography sx={endpointLabelSx}>
											{t("pages.statusPage.publicMonitorDetails.timeline.down")}
										</Typography>
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
										<Typography sx={endpointLabelSx}>
											{t("pages.statusPage.publicMonitorDetails.timeline.degraded")}
										</Typography>
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
										<Typography sx={endpointLabelSx}>
											{t("pages.statusPage.publicMonitorDetails.timeline.maintenance")}
										</Typography>
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

			<Stack>
				<Typography variant="h6">Incidents</Typography>
				<Stack>
					{incidentsLoading && <Typography>Loading incidents...</Typography>}
					{incidentError && (
						<Typography color="error">Error loading incidents</Typography>
					)}
					{incidentsData &&
						incidentsData?.incidents &&
						incidentsData?.incidents?.map((incident) => (
							<IncidentDetails
								key={incident.id}
								incident={incident}
								monitor={monitor}
								url={url || ""}
							/>
						))}
				</Stack>
			</Stack>
		</BasePage>
	);
};

export default PublicMonitorDetailsPage;
