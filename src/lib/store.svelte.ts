// アプリ状態。データはブラウザ（localStorage）に保存する。
//
// イベントソーシング志向（第7章）に従い、永続化するのは「イベント列」だけ。
// 案件の現在状態・通知は、このイベント列から都度導出する（events.ts）。

import { browser } from '$app/environment';
import { deriveAllDeals, deriveNotifications } from './events';
import { seedEvents, PEOPLE } from './seed';
import type { DealEvent, EventType, Role, User } from './types';

const STORAGE_KEY = 'sales-hub:events:v1';
const ROLE_KEY = 'sales-hub:role:v1';

function makeUser(role: Role): User {
	return { name: PEOPLE[role].name, email: PEOPLE[role].email, role };
}

function loadEvents(): DealEvent[] {
	if (!browser) return [];
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw === null) {
		// 初回アクセス: CSV初回インポートを模擬してサンプル投入
		const seeded = seedEvents();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
		return seeded;
	}
	try {
		return JSON.parse(raw) as DealEvent[];
	} catch {
		return [];
	}
}

function loadRole(): Role {
	if (!browser) return '営業';
	return (localStorage.getItem(ROLE_KEY) as Role) ?? '営業';
}

function newId(): string {
	if (browser && 'randomUUID' in crypto) return crypto.randomUUID();
	return `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class Store {
	events = $state<DealEvent[]>(loadEvents());
	role = $state<Role>(loadRole());

	user = $derived<User>(makeUser(this.role));
	deals = $derived(deriveAllDeals(this.events));
	notifications = $derived(deriveNotifications(this.events, this.deals));

	private persist() {
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
	}

	setRole(role: Role) {
		this.role = role;
		if (browser) localStorage.setItem(ROLE_KEY, role);
	}

	/** すべての状態変化はこのメソッド経由でイベントとして追記される（消さない） */
	append(dealId: string, type: EventType, payload: Record<string, unknown>) {
		const e: DealEvent = {
			id: newId(),
			dealId,
			type,
			at: new Date().toISOString(),
			actor: { name: this.user.name, role: this.user.role },
			payload
		};
		this.events = [...this.events, e];
		this.persist();
		return e;
	}

	/** 案件のイベント列（時系列） */
	eventsOf(dealId: string): DealEvent[] {
		return this.events.filter((e) => e.dealId === dealId);
	}

	createDeal(name: string, customer: string): string {
		const dealId = `deal-${Date.now()}`;
		this.append(dealId, 'deal_created', { name, customer, owner: this.user.name });
		return dealId;
	}

	/** 初期データ投入 / リセット（CSV初回インポートの模擬） */
	reset() {
		this.events = seedEvents();
		this.persist();
	}

	/** 全データ削除（空の状態を確認したい時用） */
	clear() {
		this.events = [];
		this.persist();
	}
}

export const store = new Store();
