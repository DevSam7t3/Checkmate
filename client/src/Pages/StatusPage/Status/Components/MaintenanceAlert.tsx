import type { Check } from "@/Types/Check";
import type { Monitor } from "@/Types/Monitor";
import {
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Box,
	Typography,
	Chip,
	Card,
	CardContent,
	Divider,
} from "@mui/material";
import {
	ChevronDown, // ChevronDown
	AlertTriangle, // AlertTriangle
	Wrench, // Wrench
	CheckCircle, // CheckCircle
} from "lucide-react";

interface StatusPageMonitor extends Monitor {
	checks?: Check[];
}

type MaintenanceAlertProps = {
	monitor: StatusPageMonitor;
};

const MaintenanceAlert = ({ monitor }: MaintenanceAlertProps) => {
	console.log(monitor);

	const latestCheck = monitor.checks?.[monitor.checks.length - 1];
	if (!latestCheck) return null;

	const isDown = latestCheck?.status === false;
	const isSlow = latestCheck?.responseTime > 1000;

	const statusText = isDown ? "Down" : isSlow ? "Degraded" : "Operational";

	const StatusIcon = isDown ? AlertTriangle : isSlow ? Wrench : CheckCircle;

	const alertColor = isDown ? "error" : isSlow ? "warning" : "success";

	const previewText = latestCheck
		? `${latestCheck.message} • ${latestCheck.responseTime}ms`
		: "No data";

	return (
		<Accordion
			sx={{
				mb: 3,
				borderRadius: "12px",
				overflow: "hidden",
				"&:before": { display: "none" },
				boxShadow: 3,
			}}
		>
			{/* HEADER */}
			<AccordionSummary expandIcon={<ChevronDown />}>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 2,
						width: "100%",
					}}
				>
					<StatusIcon color={alertColor} />

					<Box sx={{ flexGrow: 1 }}>
						<Typography fontWeight="bold">
							{statusText}: {monitor.name}
						</Typography>

						<Typography
							variant="body2"
							color="text.secondary"
						>
							{previewText}
						</Typography>
					</Box>

					<Chip
						label={statusText}
						color={alertColor}
						size="small"
					/>
				</Box>
			</AccordionSummary>

			{/* BODY */}
			<AccordionDetails>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{/* TIMELINE / STATS CARD */}
					<Card
						sx={{
							border: "1px solid",
							borderColor: "divider",
							bgcolor: "background.paper",
						}}
					>
						<CardContent>
							<Typography
								variant="subtitle2"
								gutterBottom
							>
								Latest Check
							</Typography>

							{latestCheck ? (
								<>
									<Typography variant="body2">
										Status Code: {latestCheck.statusCode}
									</Typography>
									<Typography variant="body2">
										Response Time: {latestCheck.responseTime} ms
									</Typography>
									<Typography variant="body2">
										Time: {new Date(latestCheck.createdAt).toLocaleString()}
									</Typography>
								</>
							) : (
								<Typography variant="body2">No recent checks available</Typography>
							)}
						</CardContent>
					</Card>

					{/* ERROR / MESSAGE CARD */}
					{latestCheck?.message && (
						<Card
							sx={{
								border: "1px solid",
								borderColor: "divider",
								bgcolor: "background.paper",
							}}
						>
							<CardContent>
								<Typography
									variant="subtitle2"
									gutterBottom
								>
									Message
								</Typography>

								<Typography
									variant="body2"
									sx={{
										whiteSpace: "pre-wrap",
										fontFamily: "monospace",
									}}
								>
									{latestCheck.message}
								</Typography>
							</CardContent>
						</Card>
					)}

					{/* FOOTER */}
					<Divider />

					<Box
						sx={{
							display: "flex",
							justifyContent: "flex-end",
						}}
					>
						<Typography
							variant="caption"
							color="text.secondary"
						>
							Interval: {monitor.interval / 1000}s • Type: {monitor.type}
						</Typography>
					</Box>
				</Box>
			</AccordionDetails>
		</Accordion>
	);
};

export default MaintenanceAlert;
