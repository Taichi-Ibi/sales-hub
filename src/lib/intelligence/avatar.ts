/**
 * アバター表示の共通ヘルパー。
 * 送信者名やチャンネル名から、Slack のような色付きイニシャルアイコンを作る。
 * 純粋関数なので副作用はなく、表示専用。
 */

/** アバター背景に使う色のパレット（彩度を抑えた視認性重視の8色）。 */
const AVATAR_COLORS = [
	'#0176d3',
	'#2e844a',
	'#dd7a01',
	'#9050e9',
	'#e3066a',
	'#0b827c',
	'#b5640a',
	'#5867e8'
];

/**
 * 名前またはメールアドレスから 1〜2 文字のイニシャルを作る。
 * - メールはローカル部（@ より前）を使う
 * - 英字始まりは英字のみ大文字 2 文字まで（例: "tanaka" → "TA"）
 * - 日本語など非英字始まりは先頭 1 文字（例: "佐藤花子" → "佐"）
 */
export function getInitials(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return '?';
	const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
	const first = base[0];
	if (/[a-zA-Z]/.test(first)) {
		const letters = base.replace(/[^a-zA-Z]/g, '');
		return (letters.slice(0, 2) || first).toUpperCase();
	}
	return first;
}

/** 文字列から決定的に色を選ぶ（同じ名前は常に同じ色になる）。 */
export function avatarColor(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
