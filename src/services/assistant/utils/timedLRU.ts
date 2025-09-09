// TimedLRU - LRU cache with TTL to prevent stale responses
// Prevents "coming soon" copy from sticking forever

export class TimedLRU<K, V> {
	private map = new Map<K, { v: V; exp: number }>();
	constructor(private max = 128) {}

	set(k: K, v: V, ttlMs = 6 * 60 * 60 * 1000) {
		const exp = Date.now() + ttlMs;
		this.map.set(k, { v, exp });
		if (this.map.size > this.max) {
			const first = this.map.keys().next().value;
			if (first !== undefined) this.map.delete(first);
		}
	}

	get(k: K): V | undefined {
		const item = this.map.get(k);
		if (!item) return undefined;
		if (Date.now() > item.exp) {
			this.map.delete(k);
			return undefined;
		}
		return item.v;
	}

	size() {
		return this.map.size;
	}
	clear() {
		this.map.clear();
	}
}
