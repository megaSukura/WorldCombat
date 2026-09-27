/**
 * 缩入壳中 / withdraw — 执行组织。
 *
 * 核心念头：真的把身体收进壳里、合上。壳合上的一刻你钉在原地不动，壳面按次替你把来袭整个挡下来——
 *   挡几下就裂；想再动，得等壳松开。它是本族里唯一放弃移动的一招。
 *
 * 两幕：
 *   收（windup 播「收身」，提交前只观察与预告，打断不花代价）。
 *   壳（提交后）：NativeEffects.boostWindow 把防御挂到共享身份 world_combat:status/withdraw 的壳窗口上，
 *     窗口归属这层壳载体本身；再用世界已有的 world_combat:rooted 把施法者钉住，并保存这条 root 的实例 id，
 *     开壳时只解除本招自己那一条；再给一层按次整个挡伤的 GuardEffects 池（挡满 blocks 次即裂）。
 * 结束：壳挡满、被清除或到期时，GuardEffects 池结束、按实例 id 解除本招 root、窗口随载体收回、等级一并收回。
 *   壳上只画真实剩余的 1–3 枚大壳瓣，每次挡下按来袭方向熄灭最正对的一枚，水花与脱落的壳瓣都落在壳面。
 */
namespace PokemonSkills {
    const withdrawScene = "world_combat:move_withdraw";
    const withdrawShellScene = "world_combat:move_withdraw_shell";
    const withdrawKnockScene = "world_combat:move_withdraw_knock";
    const withdrawShell = "world_combat:withdraw_shell";
    const withdrawMark = "world_combat:withdraw_mark";
    const withdrawRule = "world_combat:withdraw";
    const withdrawContribution = "world_combat:move/withdraw";
    const withdrawSealText = "world_combat.move.withdraw.text.seal";
    const withdrawOpenText = "world_combat.move.withdraw.text.open";
    const withdrawBlockText = "world_combat.move.withdraw.text.block";
    /** 表现里的参考半径：`data.scale = 实际壳半径 / 这个数`。 */
    const withdrawReferenceRadius = 1.3;

    /** 把 [x,y,z] 载荷转成点；不合法返回 null。 */
    function withdrawTuple(value: any): CombatPoint | null {
        if (!Array.isArray(value) || value.length !== 3) return null;
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        return isFinite(x) && isFinite(y) && isFinite(z) ? WorldCombat.point(x, y, z) : null;
    }
    /** 从壳心指向一点的单位方向；两点重合返回 null。 */
    function withdrawUnit(centre: CombatPoint, point: CombatPoint): CombatPoint | null {
        const delta = point.minus(centre);
        return delta.length() > 1e-6 ? delta.unit() : null;
    }
    /** 线段从壳外进入壳面的入射点；起点已在壳内或本段未进入时返回 null。 */
    function withdrawShellEntry(centre: CombatPoint, radius: number, from: CombatPoint, to: CombatPoint): CombatPoint | null {
        const f = from.minus(centre);
        const startSq = f.x() * f.x() + f.y() * f.y() + f.z() * f.z();
        if (startSq <= radius * radius) return null;
        const d = to.minus(from);
        const a = d.x() * d.x() + d.y() * d.y() + d.z() * d.z();
        if (!(a > 1e-9)) return null;
        const b = 2 * (f.x() * d.x() + f.y() * d.y() + f.z() * d.z());
        const c = startSq - radius * radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        return t >= 0 && t <= 1 ? from.plus(d.scale(t)) : null;
    }
    /**
     * 壳面接触：来源只定方向，接触点落在真实壳半径的球面上；投射物有真实弹道时优先用它与壳面的交点。
     * 没有方向就不给点，不捏造坐标。
     */
    function withdrawContact(world: CombatWorld, body: CombatObservation, radius: number, incoming: GuardEffects.Incoming): { point: CombatPoint; normal: CombatPoint } | null {
        const centre = body.position(), data: any = incoming.data || {};
        if (data.directProjectile === true) {
            const path = Array.isArray(data.projectilePath) ? data.projectilePath : [];
            for (let i = 0; i < path.length; i++) {
                const segment = path[i];
                const from = withdrawTuple(segment && segment.from), to = withdrawTuple(segment && segment.to);
                if (from === null || to === null) continue;
                const hit = withdrawShellEntry(centre, radius, from, to);
                if (hit === null) continue;
                const normal = withdrawUnit(centre, hit);
                if (normal !== null) return { point: hit, normal: normal };
            }
        }
        const source = withdrawTuple(data.sourcePosition);
        const attacker = source === null && incoming.source ? world.observe(incoming.source) : null;
        const origin = source !== null ? source : attacker === null ? null : attacker.position();
        if (origin === null) return null;
        const normal = withdrawUnit(centre, origin);
        if (normal === null) return null;
        return { point: centre.plus(normal.scale(radius)), normal: normal };
    }
    /** 按 blocks 生成的初始壳瓣索引。 */
    function withdrawPetalList(blocks: number): number[] {
        const list: number[] = [];
        for (let i = 0; i < blocks; i++) list.push(i);
        return list;
    }
    /** 当前剩余壳瓣索引；状态缺失时按剩余次数回退，不越出 blocks。 */
    function withdrawPetals(state: any, blocks: number, expected: number): number[] {
        const stored = state && state.petals;
        if (Array.isArray(stored)) {
            const clean: number[] = [];
            for (let i = 0; i < stored.length; i++) {
                const value = Number(stored[i]);
                if (isFinite(value) && value >= 0 && value < blocks) clean.push(Math.round(value));
            }
            if (clean.length > 0 || expected <= 0) return clean;
        }
        const fallback: number[] = [];
        for (let i = 0; i < Math.max(0, Math.min(blocks, expected)); i++) fallback.push(i);
        return fallback;
    }
    /** 一枚壳瓣的外法线（壳环上的水平径向）。 */
    function withdrawPetalDirection(index: number, blocks: number): number[] {
        const angle = (index / blocks) * Math.PI * 2 - Math.PI / 2;
        return [Math.cos(angle), 0, Math.sin(angle)];
    }
    /** 按来袭方向挑一枚最正对的剩余壳瓣；没有方向时保留第一枚。 */
    function withdrawPetalFacing(indices: number[], blocks: number, normal: CombatPoint): number {
        if (indices.length === 0) return -1;
        const length = Math.sqrt(normal.x() * normal.x() + normal.z() * normal.z());
        if (!(length > 1e-6)) return indices[0];
        const ux = normal.x() / length, uz = normal.z() / length;
        let best = indices[0], bestDot = -Infinity;
        for (let i = 0; i < indices.length; i++) {
            const direction = withdrawPetalDirection(indices[i], blocks);
            const dot = direction[0] * ux + direction[2] * uz;
            if (dot > bestDot) { bestDot = dot; best = indices[i]; }
        }
        return best;
    }

    // 记号：只记本次 root 的实例 id；壳开时按 id 结束本招自己的定身，不动同来源别的根。
    WorldCombat.effect(withdrawMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (value.root !== undefined && (typeof value.root !== "number" || !isFinite(value.root) || value.root < 0))
            throw new Error("Invalid withdraw mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(withdrawMark, "start", function () { });
    // 记号真实结束：把本招自己那条 root 一起解开，不会留下有定身无壳的状态。
    WorldCombat.effectHandler(withdrawMark, "end", function (effect) {
        const value = JSON.parse(effect.state());
        if (typeof value.root === "number" && value.root > 0) effect.world().operation(value.root, "world_combat:dispel", "{}");
    });
    WorldCombat.effectHandler(withdrawMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 壳的按次硬挡：只截敌对来源的攻击，每挡一次原生 charges 减一，挡满即裂并结束壳窗口。
    GuardEffects.register(withdrawRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref()) || world.friendly(incoming.source)) return false;
            return DamageSemantics.read(incoming.data).attack || String(incoming.data.kind) === "move";
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const custom: any = state;
            // 壳载体已换／已消失：这条池不是当前实例，自己结束，避免留壳。
            if (custom.carrier && !MobEffects.matches(world, effect.target(), custom.carrier)) { effect.end(); return; }
            const left = Math.max(0, Math.round(state.charges));
            const blocks = Math.max(1, Math.round(Number(custom.blocks) || left || 1));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            const radius = Math.max(0.4, Number(custom.radius) || scale * withdrawReferenceRadius);
            WorldFeedback.onEffect(world, effect.id(), "withdraw:petals:" + effect.id(), withdrawShellScene, 1, body.position(),
                { moment: "shell", actor: String(effect.target().ref()), blocks: blocks, left: left,
                    petals: withdrawPetals(custom, blocks, left), radius: radius, scale: scale });
            WorldFeedback.onEffect(world, effect.id(), "withdraw:sheen:" + effect.id(), withdrawScene, 1, body.position(),
                { moment: "hollow", actor: String(effect.target().ref()), blocks: blocks, left: left, scale: scale });
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const left = Math.max(0, Math.round(state.charges));
            const blocks = Math.max(1, Math.round(Number(custom.blocks) || left || 1));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            const radius = Math.max(0.4, Number(custom.radius) || scale * withdrawReferenceRadius);
            const contact = withdrawContact(world, body, radius, incoming);
            // 按真实来袭方向消费一枚壳瓣：剩下的索引与脱落的那一枚共用。
            const remaining = withdrawPetals(custom, blocks, left + 1);
            const consumed = contact === null ? (remaining.length > 0 ? remaining[0] : -1)
                : withdrawPetalFacing(remaining, blocks, contact.normal);
            const petals: number[] = [];
            for (let i = 0; i < remaining.length; i++) if (remaining[i] !== consumed) petals.push(remaining[i]);
            custom.petals = petals;
            // 消费后立刻落盘，pulse 与掉落读到同一份剩余索引。
            effect.state(JSON.stringify(state));
            const data: any = { moment: "block", actor: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                left: left, blocks: blocks, scale: scale, radius: radius, petals: petals, petal: consumed, start: world.tick(),
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) };
            if (contact !== null) data.direction = [contact.normal.x(), contact.normal.y(), contact.normal.z()];
            // 水花落在真实壳面接触点。
            WorldFeedback.emit(world, withdrawScene, 1, contact === null ? body.position() : contact.point, data, 22);
            // 掉落从被消费那一瓣的真实壳面起点飞出，方向为该瓣外法线；与持壳共用索引与几何。
            const knockData: any = { moment: "knock", actor: String(target.ref()), blocks: blocks, petal: consumed,
                left: left, scale: scale, radius: radius, start: world.tick() };
            if (consumed >= 0) knockData.direction = withdrawPetalDirection(consumed, blocks);
            WorldFeedback.emit(world, withdrawKnockScene, 1, body.position(), knockData, 22);
            // 剩几枚画几枚：这一次消费后立刻更新壳面。
            WorldFeedback.onEffect(world, effect.id(), "withdraw:petals:" + effect.id(), withdrawShellScene, 1, body.position(),
                { moment: "shell", actor: String(target.ref()), blocks: blocks, left: left, petals: petals, radius: radius, scale: scale });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), withdrawBlockText, [left], 22);
            world.sound("minecraft:block.slime_block.hit", body.position(), 12, "{}");
            if (left <= 0) {
                const shell = MobEffects.read(world, target, withdrawShell);
                if (shell !== null) world.removeMobEffect(target, shell.id(), shell.key());
            }
        }
    });

    /** 收掉本招上一份壳池与定身：重放只维护一份壳，也不会把别的来源的根一起清掉。 */
    function withdrawPurge(world: CombatWorld, actor: CombatActor): void {
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === withdrawRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
        const marks = world.effects(actor, withdrawMark);
        for (let i = 0; i < marks.length; i++) {
            const state = JSON.parse(String(marks[i].data()));
            if (typeof state.root === "number" && state.root > 0) world.operation(state.root, "world_combat:dispel", "{}");
            world.operation(marks[i].id(), "world_combat:dispel", "{}");
        }
    }

    define({
        id: "withdraw",
        cooldownParameter: "wait",
        name: "缩入壳中",
        description: "提高防御并获得可阻挡数次攻击的保护，期间无法移动。",
        uses: ["硬吃一轮爆发：把身体收进壳里，让壳按次挡下来袭", "被集火时钉住不动，用壳的次数换队友的时间", "用一次短窗口把防御抬起来再探出去打"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 5,
        cooldown: 110,
        style: "shell",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 12, panic: 0.5 } },
        fields: [flag("deep", "深潜")],
        indicator: function (config, pokemon) {
            return { radius: p("withdraw", "shell", pokemon), geometry: "area", style: "shell", color: 0x4C7FA8,
                label: config && config.deep === true ? "缩入壳中 · 深潜" : "缩入壳中 · 浅缩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["withdraw"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("withdraw", "tempo", context)),
                recover: Math.round(p("withdraw", "aftercast", context)),
                cooldown: Math.round(p("withdraw", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_withdraw:tuck", withdrawScene, 1, action.origin(),
                JSON.stringify({ moment: "tuck", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        // G 菜单里只在壳真的在身时出现「松壳」，解除本效果及所属 root／guard；不新增常驻 HUD 条或快捷键。
        menu: function (context, _slot) {
            const world = context.world, actor = context.actor;
            if (!world || !actor) return { items: [] };
            if (MobEffects.read(world, actor, withdrawShell) === null) return { items: [] };
            return { items: [{
                id: "moves/withdraw/release", parent: "moves/withdraw", order: 60, target: "none",
                label: { key: "worldcombat.skill.withdraw.menu.release" },
                detail: { key: "worldcombat.skill.withdraw.menu.release_hint" },
                command: "withdraw-release"
            }] };
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(1, Math.round(p("withdraw", "gift", action))));
            const blocks = Math.max(1, Math.min(3, Math.round(p("withdraw", "blocks", action))));
            const window = Math.max(60, Math.round(p("withdraw", "window", action)));
            const shell = Math.max(0.6, p("withdraw", "shell", action));
            const scale = shell / withdrawReferenceRadius;
            // 已有壳不叠放：先收掉本招旧池与旧定身，只维护一份壳。
            withdrawPurge(world, actor);
            const before = NativeEffects.effectiveStage(world, actor, "def");
            const previous = MobEffects.read(world, actor, withdrawShell);
            // 只用最终这一份壳载体：amplifier 保持 0，等级由 boostWindow 的窗口承担，不做二次替换换锚。
            const carrier = MobEffects.apply(world, actor, withdrawShell, window, 0);
            // 没有真实载体就不留 root／guard，避免有定身无壳。
            if (!carrier) { done(action); return; }
            const ticks = carrier.duration();
            NativeEffects.boostWindow(world, actor, { def: gift }, ticks, withdrawContribution, carrier, previous);
            const levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
            const anchor = MobEffects.anchor(carrier);
            // 定身、按次壳与等级同属这一份载体：都绑最终锚，旧锚不会误及新护层。
            const rootId = world.effect("world_combat:rooted", actor, "{}", ticks);
            world.effect(withdrawMark, actor, JSON.stringify({ root: rootId, shell: anchor.id, key: anchor.key }), ticks);
            GuardEffects.apply(world, actor, { rule: withdrawRule, mode: "ward", capacity: 0, fraction: 1,
                minimumHealth: 0, charges: blocks, linkRange: 0, blocks: blocks, scale: scale, radius: shell,
                petals: withdrawPetalList(blocks), carrier: anchor } as any, ticks);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, withdrawScene, 1, feet,
                { moment: "seal", actor: String(actor.ref()), levels: levels, blocks: blocks, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, 0.5 + blocks * 0.3)) }, 32);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), withdrawSealText,
                [levels, blocks], 30);
            world.sound("minecraft:item.armor.equip_turtle", body.position(), 16, "{}");
            world.sound("cobblemon:move.withdraw.actor", body.position(), 14, "{}");
            done(action);
        }
    });

    // 壳挡满、被清除或到期：结束本招池、按实例 id 解除本招 root、收回抬起的等级。
    WorldCombat.on("world_combat:move_withdraw/open", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== withdrawShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／换壳：已换成同一次施放的新壳，不当作开壳。
        if (MobEffects.read(world, actor, withdrawShell) !== null) return;
        withdrawPurge(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, withdrawScene, 1, body.position(), { moment: "open", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), withdrawOpenText, [], 24);
        world.sound("minecraft:entity.turtle.shamble", body.position(), 12, "{}");
    });

    // G 菜单主动松壳：移除壳载体，所属 root／guard 由移除事件统一释放。
    CompanionRepertoire.catalogue.commands.register("withdraw-release", function (view) {
        const world = view.world(), actor = view.actor();
        if (!world.valid(actor)) return;
        const shell = MobEffects.read(world, actor, withdrawShell);
        if (shell !== null) world.removeMobEffect(actor, shell.id(), shell.key());
    });
}
