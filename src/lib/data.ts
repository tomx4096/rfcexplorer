import type { ComponentType } from 'svelte';

export interface Area {
	slug: string;
	name: string;
	tagline: string;
	description: string;
	icon: string;
	color: string;
	wgCount: number;
	rfcCount: number;
	funFact: string;
}

export interface WorkingGroup {
	slug: string;
	name: string;
	fullName: string;
	area: string;
	description: string;
	summary: string;
	rfcCount: number;
	keyRfcs: number[];
}

export interface RFC {
	number: number;
	title: string;
	wg: string;
	area: string;
	status: 'standard' | 'proposed-standard' | 'draft-standard' | 'experimental' | 'historic' | 'informational' | 'best-current-practice';
	date: string;
	authors: string[];
	summary: string;
	impact: string;
	beginner: string;
	obsoletes: number[];
	updatedBy: number[];
	updates: number[];
	obsoletedBy: number[];
}

export interface GraphEdge {
	source: number;
	target: number;
	type: 'obsoletes' | 'updates' | 'uses' | 'extends' | 'related' | 'used-by';
}

export const STATUS_COLORS: Record<string, string> = {
	'standard': '#22c55e',
	'proposed-standard': '#3b82f6',
	'draft-standard': '#8b5cf6',
	'experimental': '#f59e0b',
	'historic': '#6b7280',
	'informational': '#64748b',
	'best-current-practice': '#06b6d4'
};

export const STATUS_LABELS: Record<string, string> = {
	'standard': 'Standard',
	'proposed-standard': 'Proposed Standard',
	'draft-standard': 'Draft Standard',
	'experimental': 'Experimental',
	'historic': 'Historic',
	'informational': 'Informational',
	'best-current-practice': 'Best Current Practice'
};

export const EDGE_COLORS: Record<string, string> = {
	'obsoletes': '#ef4444',
	'updates': '#f59e0b',
	'uses': '#3b82f6',
	'extends': '#8b5cf6',
	'related': '#6b7280',
	'used-by': '#22c55e'
};
