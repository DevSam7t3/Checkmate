import { Box, Chip, Typography } from "@mui/material";

export const SEVERITY_STYLES: Record<
	string,
	{ label: string; bg: string; color: string; border: string }
> = {
	critical: {
		label: "Critical",
		bg: "#3f1515",
		color: "#f87171",
		border: "#7f2222",
	},
	high: {
		label: "High",
		bg: "#2a1f0f",
		color: "#fb923c",
		border: "#7c3a0f",
	},
	medium: {
		label: "Medium",
		bg: "#1c2a3a",
		color: "#60a5fa",
		border: "#1e4a7a",
	},
	low: {
		label: "Low",
		bg: "#0f2a1c",
		color: "#4ade80",
		border: "#166534",
	},
};

export const STATUS_STYLES: Record<
	string,
	{ bg: string; color: string; border: string; dot: string }
> = {
	investigating: {
		bg: "#1c2a3a",
		color: "#60a5fa",
		border: "#1e4a7a",
		dot: "#60a5fa",
	},
	identified: {
		bg: "#2a1f0f",
		color: "#fb923c",
		border: "#7c3a0f",
		dot: "#fb923c",
	},
	monitoring: {
		bg: "#1e1a2e",
		color: "#c4b5fd",
		border: "#4c3a7a",
		dot: "#a78bfa",
	},
	resolved: {
		bg: "#0f2a1c",
		color: "#4ade80",
		border: "#166534",
		dot: "#4ade80",
	},
	update: {
		bg: "#1c2a3a",
		color: "#60a5fa",
		border: "#1e4a7a",
		dot: "#60a5fa",
	},
};

export const getStatusStyle = (status: string) =>
	STATUS_STYLES[status.toLowerCase()] ?? STATUS_STYLES.update;

export const getSeverityStyle = (severity: string) =>
	SEVERITY_STYLES[severity.toLowerCase()] ?? SEVERITY_STYLES.medium;

export const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

export function StatusBadge({ status, label }: { status: string, label: string }) {
	const s = getStatusStyle(status);

	return (
		<Chip
			label={label}
			size="small"
			sx={{
				background: s.bg,
				color: s.color,
				border: `0.5px solid ${s.border}`,
				borderRadius: "999px",
				fontWeight: 500,
				fontSize: 10,
				letterSpacing: "0.06em",
				textTransform: "uppercase",
				height: 22,
			}}
		/>
	);
}

export function SeverityBadge({ severity, label }: { severity: string, label: string }) {
	const s = getSeverityStyle(severity);
	return (
		<Chip
			label={label}
			size="small"
			sx={{
				background: s.bg,
				color: s.color,
				border: `0.5px solid ${s.border}`,
				borderRadius: "999px",
				fontWeight: 500,
				fontSize: 10,
				letterSpacing: "0.06em",
				textTransform: "uppercase",
				height: 22,
				flexShrink: 0,
			}}
		/>
	);
}

export function MetaCard({
	label,
	value,
	valueColor,
}: {
	label: string;
	value: string;
	valueColor?: string;
}) {
	return (
		<Box
			sx={{
				background: "#18181b",
				border: "0.5px solid rgba(255,255,255,0.08)",
				borderRadius: 2,
				p: "14px 16px",
			}}
		>
			<Typography
				sx={{
					fontSize: 10,
					fontWeight: 500,
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					color: "#71717a",
					mb: 0.5,
				}}
			>
				{label}
			</Typography>
			<Typography
				sx={{
					fontSize: 20,
					fontWeight: 500,
					color: valueColor ?? "#e4e4e7",
					lineHeight: 1.2,
				}}
			>
				{value}
			</Typography>
		</Box>
	);
}

export function TimelineDot({ status }: { status: string }) {
	const s = getStatusStyle(status);
	return (
		<Box
			sx={{
				width: 10,
				height: 10,
				borderRadius: "50%",
				background: s.dot,
				boxShadow: `0 0 0 3px ${s.dot}26`,
				flexShrink: 0,
				mt: "4px",
			}}
		/>
	);
}
