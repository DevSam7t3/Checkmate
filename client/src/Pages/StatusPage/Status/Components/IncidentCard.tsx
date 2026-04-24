import { useTheme } from "@mui/material/styles";
import type { Monitor } from "@/Types/Monitor";
import { Box, Card, CardContent, Typography, Grid, Stack } from "@mui/material";

import { useNavigate } from "react-router-dom";
import { fmt, SeverityBadge, StatusBadge } from "./IncidentDetail";
import { useTranslation } from "react-i18next";

type Update = {
	id: number;
	incident_id: number;
	message: string;
	status: "investigating" | "identified" | "monitoring" | "resolved";
	created_at: string;
};

export type Incident = {
	id: number;
	service: number; // ⚠️ just ID now
	title: string;
	status: "investigating" | "identified" | "monitoring" | "resolved";
	severity: "critical" | "major" | "minor";
	resolved_at: string | null;
	updates?: Update[];
};

interface Props {
	incident: Incident;
	monitor: Monitor & { checks?: Monitor["recentChecks"] };
	url: string;
}

export default function IncidentDetails({ incident, monitor, url }: Props) {
	const {t} = useTranslation();
	const theme = useTheme();

	const navigate = useNavigate();
	const startedAt = incident.updates?.[0]?.created_at;

	const onClick = () => {
		navigate(
			`/status/public/incident/${encodeURIComponent(monitor.name)}/${incident.id}?monitorId=${monitor.id}&url=${encodeURIComponent(url)}`
		);
	};

	const borderColor =
		theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

	return (
		<Card
			sx={{
				background: "#18181b",
				border: `0.5px solid ${borderColor}`,
				borderRadius: 3,
				mb: 5,
				cursor: "pointer"
			}}
			elevation={0}
			onClick={onClick}
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
	);
}
