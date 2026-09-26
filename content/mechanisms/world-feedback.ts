/**
 * 表现载荷契约（字段由客户端 ParticleInstance / Anchors 消费）：
 * - source 绑定读取宿主按作用域写入的消息来源；target／projectile 读取 data 中的同名 actor ref 字符串。
 * - point 读取 data.point 的 [x,y,z]，省略时使用 emit／keep 的 point 参数。
 * - path 读取 data.path：顶点可为 [x,y,z]、actor ref，或 source／target／projectile 的字段引用。
 * - moment 选择场景阶段；intensity 缩放 rate／burst.count；scale 缩放粒子尺寸，并按 fit 规则影响形状／运动尺度。
 * - direction 供 orient:direction 使用；朝向目标的运动／orient:toward 读取 target 锚点。
 * - 数值叶可用 { data: "字段.子字段", fallback: 数值 } 绑定任意载荷数；更新影响后续生成，沿用当前 moment 的时钟。
 * - 颜色可用 { data, fallback }、{ gradient: [[t, 色], ...] } 或
 *   { attribute: "字段", colors: { 小写 id: 色 }, fallback } 按载荷里的属性小写 id 取色；渐变按当前 moment 进度采样。
 * - WorldCombatClient.scene 的 frame.data() 是完整条目 JSON；自定义绘制读取 entry.data，可逐帧表达精确计数与筛选。
 * - emit 可带可选 key 合并同名单次浮字；keep 维持并更新同一实例。伤害驱动的表现读 receipt(event) 的实际伤害，一次事件一次；
 *   若公式／伤害层后续给出更完整的回执入口，receipt 改为转发它，不再各自解析与重算。
 * 客户端类型、绑定与生命周期契约见 sdk/client/index.d.ts。
 * action.present 采用同一载荷语义，可在提交前播放，随动作清理；emit／keep 需要可写世界，按 ticks 独立存续。
 */
namespace WorldFeedback {
    interface Message { key: string; scene: string; version: number; position: number[]; data: any; }
    export interface ActionScenes {
        show(action: CombatAction, key: string, point: CombatPoint, data: any): void;
        /** Stop one phase or every active phase; already emitted particles follow the scene's authored drain. */
        stop(action: CombatAction, key?: string): void;
        finish(action: CombatAction, done: (current: CombatAction) => void): void;
    }
    /** Presentations owned by one invocation. Content stops movement phases when it changes phase or completes. */
    export function actionScenes(scene: string, version = 1): ActionScenes {
        const active: { [key: string]: { id: number; data: string; point: number[] } } = Object.create(null);
        let next = 0;
        function stop(action: CombatAction, key?: string): void {
            (key === undefined ? Object.keys(active) : [key]).forEach(name => {
                const entry = active[name];
                if (!entry) return;
                const data = JSON.parse(entry.data);
                data.lifecycle = { reason: "settled", tick: action.sense().tick() };
                action.present(scene + "/action/" + name + "/" + entry.id, scene, version,
                    WorldCombat.point(entry.point[0], entry.point[1], entry.point[2]), JSON.stringify(data));
                delete active[name];
            });
        }
        return {
            show: (action, key, point, data) => {
                const entry = active[key] || (active[key] = { id: ++next, data: "{}", point: [] });
                entry.data = JSON.stringify(data);
                entry.point = [point.x(), point.y(), point.z()];
                action.present(scene + "/action/" + key + "/" + entry.id, scene, version, point, entry.data);
            },
            stop: stop,
            finish: (action, done) => { stop(action); done(action); }
        };
    }
    /** Longest a single feedback message stays alive; longer requests are held for this span and can be renewed with keep(). */
    export const maxTicks = 6000;
    function bounded(ticks: number): number { return Math.max(1, Math.min(maxTicks, Math.round(ticks))); }
    function message(key: string, scene: string, version: number, point: CombatPoint, data: any): Message {
        return { key: key, scene: scene, version: version, position: [point.x(), point.y(), point.z()], data: data };
    }
    /**
     * One-shot emission. `key` is optional and merges renders that carry the same key (the client
     * scene keys floats by key + start), but each call still creates its own effect; use keep() to
     * renew one instance instead of emitting again.
     */
    export function emit(world: CombatWorld, scene: string, version: number, point: CombatPoint, data: any, ticks: number, key?: string): number {
        return world.effect("world_combat:feedback", world.source(), JSON.stringify(message(key || "", scene, version, point, data)), bounded(ticks));
    }
    /** One floating line at a world point; `key` and `args` resolve against the unit's own lang on the client. */
    export function text(world: CombatWorld, point: CombatPoint, key: string, args: any[], ticks: number): number {
        return emit(world, "world_combat:feedback", 1, point,
            { kind: "world-text", start: world.tick(), duration: bounded(ticks), key: key, args: args }, ticks);
    }
    export function keep(world: CombatWorld, key: string, scene: string, version: number, point: CombatPoint, data: any, ticks: number): void {
        var actor = world.source(), instances = world.effects(actor, "world_combat:feedback");
        var value = message(key, scene, version, point, data);
        for (var i = 0; i < instances.length; i++) {
            if (String(instances[i].source().ref()) === String(actor.ref()) && JSON.parse(instances[i].data()).key === key) {
                world.operation(instances[i].id(), "world_combat:feedback-update", JSON.stringify({ value: value, ticks: bounded(ticks) })); return;
            }
        }
        world.effect("world_combat:feedback", actor, JSON.stringify(value), bounded(ticks));
    }
    /** A continuous visual owned by an existing effect from this source; its actual lifecycle controls cleanup. */
    export function onEffect(world: CombatWorld, effect: number, key: string, scene: string, version: number, point: CombatPoint, data: any): boolean {
        return world.presentOn(effect, key, scene, version, point, JSON.stringify(data));
    }
    /** Actual damage facts, read once from a world_combat:damage_applied receipt. */
    export interface DamageReceipt {
        target: CombatActor; point: CombatPoint; actual: number; critical: boolean;
        move: string; type: string; effectiveness: number; targetScale: number;
    }
    /**
     * Parses the actual damage a world_combat:damage_applied event reports. Damage-driven presentation
     * calls this inside its own handler once per event; it never resolves a theoretical value in place
     * of `actual`. When the formula/damage layer publishes a richer receipt entry, delegate to it here.
     */
    export function receipt(event: CombatWorldEvent): DamageReceipt | null {
        const target = event.target();
        if (!target) return null;
        const data = JSON.parse(String(event.data()));
        const actual = typeof data.actual === "number" && isFinite(data.actual) ? data.actual : 0;
        if (!(actual > 0)) return null;
        let point: CombatPoint | null = null;
        if (typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number")
            point = WorldCombat.point(data.x, data.y, data.z);
        else {
            const body = event.world().observe(target);
            if (body) point = body.position();
        }
        if (!point) return null;
        return {
            target: target, point: point, actual: actual, critical: data.critical === true,
            move: String(data.move || ""), type: String(data.type || ""),
            effectiveness: typeof data.effectiveness === "number" ? data.effectiveness : 1,
            targetScale: typeof data.targetScale === "number" && data.targetScale > 0 ? data.targetScale : 1
        };
    }
    function present(effect: CombatEffect): void {
        var state: Message = JSON.parse(effect.state());
        effect.world().present("world_combat:message", state.scene, state.version,
            WorldCombat.point(state.position[0], state.position[1], state.position[2]), JSON.stringify(state.data));
    }
    WorldCombat.effect("world_combat:feedback", 1, maxTicks, "actor", function (json) {
        var data = JSON.parse(json);
        if (typeof data.scene !== "string" || !Array.isArray(data.position) || data.position.length !== 3 ||
            !data.position.every(function (n: any) { return typeof n === "number" && isFinite(n); })) throw new Error("Invalid feedback position");
        return JSON.stringify(data);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler("world_combat:feedback", "start", present);
    WorldCombat.effectHandler("world_combat:feedback", "operation:world_combat:feedback-update", function (effect) {
        if (String(effect.caller().ref()) !== String(effect.source().ref())) { effect.reject("feedback-not-owned"); return; }
        var request = JSON.parse(effect.input()); effect.state(JSON.stringify(request.value)); effect.remaining(request.ticks); present(effect);
    });
}
