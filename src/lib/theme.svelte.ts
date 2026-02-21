export const theme = $state({ dark: true });

export function applyThemeClass(dark: boolean) {
	if (typeof document !== 'undefined') {
		document.documentElement.classList.toggle('dark', dark);
	}
}

export function toggleTheme() {
	theme.dark = !theme.dark;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('theme', theme.dark ? 'dark' : 'light');
	}
	applyThemeClass(theme.dark);
}

export function initTheme() {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
	theme.dark = stored ? stored === 'dark' : true;
	applyThemeClass(theme.dark);
}
