import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import InputBase from "@mui/material/InputBase";
import MenuItem from "@mui/material/MenuItem";
import { Icon } from "@/Components/design-elements";
import { Button, Select } from "@/Components/inputs";
import {
	Settings,
	ExternalLink,
	ChevronLeft,
	Languages,
	Search,
	RefreshCw,
	Pause,
	Play,
} from "lucide-react";

import { useTheme } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { StatusPage } from "@/Types/StatusPage";
import type { RootState } from "@/Types/state";

interface HeaderStatusPageControlsProps {
	isAdmin: boolean;
	statusPage: StatusPage;
	isPublic?: boolean;
	onSearchChange?: (value: string) => void;
	onRefreshNow?: () => Promise<unknown> | unknown;
	refreshIntervalSeconds?: number;
}

export const HeaderStatusPageControls = ({
	isAdmin,
	statusPage,
	isPublic = false,
	onSearchChange,
	onRefreshNow,
	refreshIntervalSeconds = 60,
}: HeaderStatusPageControlsProps) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const { language: dashboardLanguage = "en" } = useSelector(
		(state: RootState) => state.ui
	);

	const refreshIntervalMs = Math.max(1000, refreshIntervalSeconds * 1000);
	const localeStorageKey = `publicStatusPageLanguage:${statusPage.url}`;

	const [searchValue, setSearchValue] = useState("");
	const [isPaused, setIsPaused] = useState(false);
	const [remainingMs, setRemainingMs] = useState(refreshIntervalMs);
	const [lastRefreshAt, setLastRefreshAt] = useState<Date>(new Date());
	const [isRefreshingNow, setIsRefreshingNow] = useState(false);
	const [publicLanguage, setPublicLanguage] = useState(() => {
		if (!isPublic) return i18n.language || dashboardLanguage || "en";

		const stored = window.localStorage.getItem(localeStorageKey);
		return stored || i18n.language || dashboardLanguage || "en";
	});
	const isRefreshingRef = useRef(false);

	const languages = useMemo(() => Object.keys(i18n.options.resources || {}), [i18n]);
	const refreshInSeconds = useMemo(() => Math.ceil(remainingMs / 1000), [remainingMs]);
	const progressValue = useMemo(
		() => Math.max(0, Math.min(100, (remainingMs / refreshIntervalMs) * 100)),
		[remainingMs, refreshIntervalMs]
	);

	useEffect(() => {
		setRemainingMs(refreshIntervalMs);
	}, [refreshIntervalMs]);

	useEffect(() => {
		if (!isPublic) return;

		const stored = window.localStorage.getItem(localeStorageKey);
		const languageToUse = stored || publicLanguage || dashboardLanguage || "en";

		setPublicLanguage(languageToUse);
		if (i18n.language !== languageToUse) {
			void i18n.changeLanguage(languageToUse);
		}

		return () => {
			if (i18n.language !== dashboardLanguage) {
				void i18n.changeLanguage(dashboardLanguage);
			}
		};
	}, [dashboardLanguage, i18n, isPublic, localeStorageKey]);

	const handleRefreshNow = useCallback(async () => {
		if (isRefreshingRef.current) return;

		isRefreshingRef.current = true;
		setIsRefreshingNow(true);
		try {
			await onRefreshNow?.();
		} finally {
			setLastRefreshAt(new Date());
			setRemainingMs(refreshIntervalMs);
			setIsRefreshingNow(false);
			isRefreshingRef.current = false;
		}
	}, [onRefreshNow, refreshIntervalMs]);

	useEffect(() => {
		if (isPaused) return;

		const timer = window.setInterval(() => {
			setRemainingMs((current) => {
				const next = current - 100;
				if (next <= 0) {
					void handleRefreshNow();
					return refreshIntervalMs;
				}
				return next;
			});
		}, 100);

		return () => window.clearInterval(timer);
	}, [handleRefreshNow, isPaused, refreshIntervalMs]);

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
		onSearchChange?.(value);
	};

	const handlePublicLanguageChange = (value: string) => {
		setPublicLanguage(value);
		window.localStorage.setItem(localeStorageKey, value);
		void i18n.changeLanguage(value);
	};

	return (
		<Stack
			gap={3.5}
			mb={5}
		>
			<Stack
				direction={{ xs: "column", lg: "row" }}
				alignItems={{ xs: "stretch", lg: "center" }}
				justifyContent="space-between"
				gap={3}
			>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					spacing={3}
					alignItems={{ xs: "flex-start", sm: "center" }}
				>
					<Stack
						spacing={1.75}
						sx={{ minWidth: 0 }}
					>
						<Typography
							variant="h1"
							overflow="hidden"
							textOverflow="ellipsis"
							sx={{
								maxWidth: { xs: "280px", sm: "100%" },
								lineHeight: 1.2,
							}}
						>
							{statusPage?.companyName}
						</Typography>
						<Stack
							direction="row"
							spacing={1}
							sx={{
								alignItems: "center",
								textDecoration: "underline",
								cursor: "pointer",
								color: "gray",
								transition: "all 0.3s ease",
								":hover": {
									color: "white",
								},
							}}
						>
							<ChevronLeft size={14} />
							<Typography
								onClick={() => {
									navigate(-1);
								}}
							>
								{t("components.headerStatusPageControls.goBack")}
							</Typography>
						</Stack>
					</Stack>

					{statusPage?.isPublished && !isPublic && (
						<Stack
							direction="row"
							spacing={1}
							alignItems="center"
						>
							<Typography
								onClick={() => {
									window.open(
										`/status/public/${statusPage.url}`,
										"_blank",
										"noopener,noreferrer"
									);
								}}
								sx={{
									borderBottom: 1,
									borderColor: "transparent",
									":hover": {
										cursor: "pointer",
										borderBottom: 1,
									},
								}}
							>
								{t("components.headerStatusPageControls.publicLink")}
							</Typography>
							<Box>
								<ExternalLink size={14} />
							</Box>
						</Stack>
					)}
				</Stack>

				<Stack
					direction={{ xs: "column", sm: "row" }}
					spacing={2}
					alignItems={{ xs: "stretch", sm: "center" }}
					sx={{ width: { xs: "100%", lg: "auto" } }}
				>
					{isPublic && (
						<Select
							size="small"
							value={publicLanguage}
							onChange={(event) => {
								handlePublicLanguageChange(event.target.value as string);
							}}
							sx={{ minWidth: 150 }}
							startAdornment={
								<Box sx={{ display: "flex", mr: 1 }}>
									<Languages size={14} />
								</Box>
							}
						>
							{languages.map((lang) => (
								<MenuItem
									key={lang}
									value={lang}
								>
									{lang.toUpperCase()}
								</MenuItem>
							))}
						</Select>
					)}

					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1,
							border: `1px solid ${theme.palette.divider}`,
							borderRadius: 2,
							px: 1.5,
							py: 0.75,
							minWidth: { xs: "100%", sm: 320 },
						}}
					>
						<Search
							size={16}
							color={theme.palette.text.secondary}
						/>
						<InputBase
							value={searchValue}
							onChange={(event) => handleSearchChange(event.target.value)}
							placeholder={t("components.headerStatusPageControls.searchPlaceholder", {
								defaultValue: "Search monitors...",
							})}
							sx={{ width: "100%", fontSize: "0.9rem" }}
						/>
					</Box>

					{isAdmin && (
						<Button
							variant="contained"
							color="secondary"
							startIcon={<Icon icon={Settings} />}
							onClick={() => navigate(`/status/configure/${statusPage.url}`)}
						>
							{t("common.buttons.configure")}
						</Button>
					)}
				</Stack>
			</Stack>

			<Stack spacing={1.5}>
				<LinearProgress
					variant="determinate"
					value={isPaused ? 0 : progressValue}
					sx={{
						height: 8,
						borderRadius: 999,
						backgroundColor:
							theme.palette.mode === "dark"
								? "rgba(255,255,255,0.12)"
								: "rgba(0,0,0,0.1)",
						"& .MuiLinearProgress-bar": {
							borderRadius: 999,
							transition: "transform 120ms linear !important",
						},
					}}
				/>

				<Stack
					direction={{ xs: "column", md: "row" }}
					justifyContent="space-between"
					alignItems={{ xs: "flex-start", md: "center" }}
					gap={2}
				>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
					>
						<Typography
							variant="body2"
							color="text.secondary"
						>
							{t("components.headerStatusPageControls.lastRefresh", {
								defaultValue: "Last refresh",
							})}
							: {lastRefreshAt.toLocaleString()}
						</Typography>
						<Typography
							variant="body2"
							color="text.secondary"
						>
							{t("components.headerStatusPageControls.refreshIn", {
								defaultValue: "Refresh in",
							})}
							: {isPaused ? "--" : `${refreshInSeconds}s`}
						</Typography>
					</Stack>

					<Stack
						direction="row"
						spacing={1.25}
					>
						<Button
							variant="outlined"
							startIcon={<Icon icon={isPaused ? Play : Pause} />}
							onClick={() => {
								setIsPaused((current) => !current);
							}}
						>
							{isPaused
								? t("components.headerStatusPageControls.resume", {
										defaultValue: "Resume",
									})
								: t("common.buttons.pause")}
						</Button>
						<Button
							variant="contained"
							color="secondary"
							startIcon={<Icon icon={RefreshCw} />}
							onClick={() => {
								void handleRefreshNow();
							}}
							disabled={isRefreshingNow}
						>
							{t("components.headerStatusPageControls.refreshNow", {
								defaultValue: "Refresh now",
							})}
						</Button>
					</Stack>
				</Stack>
			</Stack>
		</Stack>
	);
};
