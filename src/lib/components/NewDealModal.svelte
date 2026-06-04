<script lang="ts">
	import { store } from '$lib/store.svelte';

	let { onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void } = $props();

	let name = $state('');
	let customer = $state('');

	function submit() {
		if (!name.trim() || !customer.trim()) return;
		const id = store.createDeal(name.trim(), customer.trim());
		onCreated(id);
	}
</script>

<button class="scrim" aria-label="閉じる" onclick={onClose}></button>
<div class="modal card">
	<div class="spread">
		<h3>新規案件の作成</h3>
		<button class="subtle" onclick={onClose}>✕</button>
	</div>
	<p class="faint" style="font-size:12px;margin:6px 0 14px">
		案件＝チケット。作成者が担当営業になります。
	</p>
	<div class="field">
		<label for="nd-name">案件名</label>
		<input id="nd-name" bind:value={name} placeholder="例: F社 ECサイト構築" />
	</div>
	<div class="field">
		<label for="nd-cust">顧客</label>
		<input id="nd-cust" bind:value={customer} placeholder="例: F株式会社" />
	</div>
	<div class="row" style="justify-content:flex-end;margin-top:16px">
		<button class="subtle" onclick={onClose}>キャンセル</button>
		<button class="primary" disabled={!name.trim() || !customer.trim()} onclick={submit}>
			作成
		</button>
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(20, 25, 40, 0.3);
		border: none;
		z-index: 40;
	}
	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 440px;
		max-width: 92vw;
		z-index: 41;
		padding: 20px;
	}
	.field {
		margin-bottom: 12px;
	}
</style>
