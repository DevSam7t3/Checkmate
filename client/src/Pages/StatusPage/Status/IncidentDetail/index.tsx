import { useTheme } from "@mui/material/styles";
import { useParams, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { Box, Card, CardContent, Grid, Stack, Typography, useMediaQuery, } from "@mui/material";

import { BaseFallback, BasePage } from "@/Components/design-elements";
import { HeaderStatusPageControls } from "../Components/HeaderStatusPageControls";

import { useGet } from "@/Hooks/UseApi";
import { useIsAdmin } from "@/Hooks/useIsAdmin";

import type { PublicMonitorDetailResponse } from "@/Types/StatusPage";
import { fmt, MetaCard, SeverityBadge, StatusBadge, TimelineDot, } from "../Components/IncidentDetail";
import { useTranslation } from "react-i18next";

type Update = {
	id: number;
	incident_id: number;
	message: string;
	status: "investigating" | "identified" | "monitoring" | "resolved";
	created_at: string;
};

type Incident = {
	id: number;
	service: number; // ⚠️ just ID now
	title: string;
	status: "investigating" | "identified" | "monitoring" | "resolved";
	severity: "critical" | "major" | "minor";
	resolved_at: string | null;
	updates: Update[];
};

export default function IncidentDetailsPage() {
	const { t } = useTranslation();
	const theme = useTheme();
	const { monitor: monitorName, id } = useParams();
	const [searchParams] = useSearchParams();

	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const isAdmin = useIsAdmin();

	const url = searchParams.get("url"); // ?limit=3
	const monitorId = searchParams.get("monitorId"); // ?filter=active

	const {
		data: incident,
		error,
		isLoading,
		mutate
	} = useSWR<Incident>(
		`http://10.10.10.184:8000/status/incidents/${monitorName}/?id=${id}`,
		(url: any) => {
			return fetch(url)
				.then((res) => res.json())
				.then((res) => res.incidents[0]);
		}
	);

	const apiUrl = url && monitorId ? `/status-page/${url}/monitor/${monitorId}` : null;

	const {
		data,
		isLoading: isMonitorLoading,
		error: monitorError,
		refetch,
	} = useGet<PublicMonitorDetailResponse>(apiUrl);

	if (isLoading || isMonitorLoading) {
		return <Typography>Loading...</Typography>;
	}

	if (monitorError) {
		return <Typography>Failed to fetch Data.</Typography>;
	}

	const statusPage = data?.statusPage;
	const monitor = data?.monitor;
	const summary = data?.summary;

	const contentPadding = {
		minHeight: "100vh",
		paddingTop: theme.spacing(20),
		paddingBottom: theme.spacing(20),
		paddingLeft: isSmall ? "5vw" : "20vw",
		paddingRight: isSmall ? "5vw" : "20vw",
		background: "#000000",
	};

	if (!incident || !statusPage || !monitor || !summary) {
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

	const startedAt = incident.updates?.filter((i) => i.status === "investigating")?.[0]
		?.created_at;
	const logoSrc = statusPage?.logo?.data
		? `data:${statusPage.logo.contentType};base64,${statusPage.logo.data}`
		: null;

	const borderColor =
		theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

	let duration: string | null = null;

	if (startedAt) {
		const start = new Date(startedAt).getTime();
		const now = incident.resolved_at ? new Date(incident.resolved_at).getTime() : Date.now();

		const diffMs = now - start;

		const totalSeconds = Math.floor(diffMs / 1000);
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const timePart = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
		duration = days > 0 ? `${days}d ${timePart}` : timePart;
	}

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
				onRefreshNow={() => {
					mutate();
					refetch();
				}}
				isPublic
			/>

			<Box sx={{ color: "#e4e4e7", pb: 4 }}>
				{/* Logo */}
				{logoSrc && (
					<Box
						component="img"
						src={logoSrc}
						alignSelf="flex-start"
						alt={statusPage?.companyName || ""}
						sx={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain", mb: 2 }}
					/>
				)}

				{/* ── Header card ── */}
				<Card
					sx={{
						background: "#18181b",
						border: `0.5px solid ${borderColor}`,
						borderRadius: 3,
						mb: 5,
					}}
					elevation={0}
				>
					<CardContent sx={{ p: "20px !important" }}>
						{/* Title row */}
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="flex-start"
							spacing={5}
						>
							<Box flex={1}>
								<Typography
									sx={{
										fontSize: 10,
										fontWeight: 500,
										letterSpacing: "0.07em",
										textTransform: "uppercase",
										color: "#71717a",
										mb: 0.75,
									}}
								>
									{t("pages.incident.title")}
								</Typography>

								<Typography
									variant="h6"
									sx={{ fontWeight: 500, color: "#f4f4f5", mb: 1, lineHeight: 1.35 }}
								>
									{incident.title}
								</Typography>

								{/* Service pill */}
								<Box
									sx={{
										display: "inline-flex",
										alignItems: "center",
										gap: "5px",
										background: "#27272a",
										border: "0.5px solid rgba(255,255,255,0.1)",
										borderRadius: 1.5,
										px: 1.25,
										py: 0.4,
									}}
								>
									<Box
										sx={{
											width: 7,
											height: 7,
											borderRadius: "50%",
											background: "#60a5fa",
										}}
									/>
									<Typography sx={{ fontSize: 12, color: "#a1a1aa" }}>
										{monitor.name}
									</Typography>
								</Box>
							</Box>

							<SeverityBadge
								severity={incident.severity}
								label={t("pages.incident.severity." + incident.severity)}
							/>
						</Stack>

						{/* Divider */}
						<Box
							sx={{
								borderTop: `0.5px solid ${borderColor}`,
								my: 5,
							}}
						/>

						{/* Meta row */}
						<Grid
							container
							spacing={2}
							mt={0}
							pt={2}
						>
							<Grid size={{ xs: 4 }}>
								<Typography
									sx={{
										fontSize: 10,
										fontWeight: 500,
										letterSpacing: "0.08em",
										textTransform: "uppercase",
										color: "#71717a",
										mb: 0.75,
									}}
								>
									{t("pages.incident.status.title")}
								</Typography>
								<StatusBadge
									status={incident.status}
									label={t("pages.incident.status." + incident.status)}
								/>
							</Grid>

							<Grid size={{ xs: 4 }}>
								<Typography
									sx={{
										fontSize: 10,
										fontWeight: 500,
										letterSpacing: "0.08em",
										textTransform: "uppercase",
										color: "#71717a",
										mb: 0.75,
									}}
								>
									{t("pages.incident.started")}
								</Typography>
								<Typography sx={{ fontSize: 13, fontWeight: 500, color: "#e4e4e7" }}>
									{startedAt ? new Date(startedAt).toLocaleDateString() : "—"}
									<br />
									<Box
										component="span"
										sx={{ color: "#71717a", fontWeight: 400 }}
									>
										{startedAt
											? new Date(startedAt).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
													hour12: true,
												})
											: ""}
									</Box>
								</Typography>
							</Grid>

							<Grid size={{ xs: 4 }}>
								<Typography
									sx={{
										fontSize: 10,
										fontWeight: 500,
										letterSpacing: "0.08em",
										textTransform: "uppercase",
										color: "#71717a",
										mb: 0.75,
									}}
								>
									{t("pages.incident.resolved")}
								</Typography>
								<Typography
									sx={{
										fontSize: 13,
										fontWeight: 500,
										color: incident.resolved_at ? "#4ade80" : "#52525b",
									}}
								>
									{fmt(incident.resolved_at || undefined)}
								</Typography>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* ── Stats row ── */}
				<Grid
					container
					spacing={5}
					mb={5}
				>
					<Grid size={{ xs: 4 }}>
						<MetaCard
							label={t("pages.incident.duration")}
							value={duration || "—"}
							valueColor="#f87171"
						/>
					</Grid>
					<Grid size={{ xs: 4 }}>
						<MetaCard
							label={t("pages.incident.updates")}
							value={String(incident.updates.length)}
						/>
					</Grid>
					<Grid size={{ xs: 4 }}>
						<MetaCard
							label={t("pages.incident.impact")}
							value="Partial"
							valueColor="#fb923c"
						/>
					</Grid>
				</Grid>

				{/* ── Timeline card ── */}
				<Card
					sx={{
						background: "#18181b",
						border: `0.5px solid ${borderColor}`,
						borderRadius: 3,
					}}
					elevation={0}
				>
					<CardContent sx={{ p: "20px !important" }}>
						<Typography
							sx={{
								fontSize: 14,
								fontWeight: 500,
								letterSpacing: "0.08em",
								textTransform: "uppercase",
								mb: 8,
							}}
						>
							{t("pages.incident.timeline")}
						</Typography>

						{incident.updates.length === 0 ? (
							<Typography sx={{ color: "#52525b", fontSize: 13 }}>
								{t("pages.incident.noUpdates")}
							</Typography>
						) : (
							<Box
								sx={{ position: "relative", pl: "22px" }}
								component={Stack}
								spacing={10}
							>
								{incident.updates.map((update, idx) => {
									const isLast = idx === incident.updates.length - 1;

									return (
										<Box
											key={update.id}
											sx={{ position: "relative", mb: isLast ? 0 : 3 }}
											component={Stack}
											spacing={2}
										>
											{!isLast && (
												<Box
													sx={{
														position: "absolute",
														left: -18,
														top: 16,
														bottom: -24,
														width: "1px",
														background: "rgba(255,255,255,0.07)",
													}}
												/>
											)}

											{/* Dot */}
											<Box sx={{ position: "absolute", left: -22, top: 2 }}>
												<TimelineDot status={update.status} />
											</Box>

											{/* Content */}
											<Stack
												direction="row"
												alignItems="center"
												spacing={5}
												flexWrap="wrap"
											>
												<StatusBadge
													status={update.status}
													label={t("pages.incident.status." + update.status)}
												/>
												<Typography sx={{ fontSize: 11, color: "#a2a2b0" }}>
													{new Date(update.created_at).toLocaleString()}
												</Typography>
												{idx === 0 && (
													<Box
														sx={{
															background: "#27272a",
															color: "#9898ab",
															fontSize: 10,
															px: 2,
															py: 1,
															borderRadius: 1,
														}}
													>
														{t("pages.incident.status.latest")}
													</Box>
												)}
											</Stack>

											<Typography
												sx={{
													fontSize: 13,
													color: "#a1a1aa",
													lineHeight: 1.6,
												}}
											>
												{update.message}
											</Typography>
										</Box>
									);
								})}
							</Box>
						)}
					</CardContent>
				</Card>
			</Box>
		</BasePage>
	);
}
