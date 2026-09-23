/**
 * 山岚摔 / stormthrow —— 注册、逐退门禁与动作。
 *
 * 核心念头：贴身的摔投。抓住对手、借它的冲势把它整个人掀翻砸在地上；正面站桩打不出这种角度，
 *   摔到无法卸力的姿态才每一下都砸在薄弱处（必定击中要害）。
 *
 * 两幕：
 *   起（windup，提交前）：沉身、双手拢起，只播预告。
 *   摔（grab → slam，提交后）：先贴身半步；抓中后隔 3 刻把对手按 `slam` 结算一次**必定要害**的物理伤害、
 *       沿下砸方向掀翻（`crush`），打上共享身份 stagger（本单元效果，行为见下方门禁：无法开始新动作、
 *       移动被效果自带修饰压低），落点砸出翻起的碎土（租借，linger，到期原方块回来）。目标在抓取前退出
 *       抓取距离就抓空。
 *
 * 与巴投分开：巴投把对手从头顶摔到背后并逐出交战圈；山岚摔把对手就地掀翻、压住一个身位。
 */
namespace PokemonSkills {
    /** 在落点砸出一小片翻起的碎土（租借，linger，到期原方块回来）；返回实际砸出的格数。 */
    function stormthrowScar(world: CombatWorld, point: CombatPoint, cells: number, ticks: number): number {
        const list: any[] = [];
        const limit = Math.max(4, Math.round(cells));
        const baseY = Math.floor(point.y()), centreX = Math.floor(point.x()), centreZ = Math.floor(point.z());
        for (let dx = -2; dx <= 2 && list.length < limit; dx++) {
            for (let dz = -2; dz <= 2 && list.length < limit; dz++) {
                if (dx * dx + dz * dz > 5) continue;
                const x = centreX + dx, z = centreZ + dz;
                for (let dy = 1; dy >= -3; dy--) {
                    const y = baseY + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    const above = world.block(WorldCombat.point(x, y + 1, z));
                    const over = above === null ? "" : String(above.id());
                    if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                        list.push({ x: x, y: y, z: z, block: "minecraft:coarse_dirt" });
                    break;
                }
            }
        }
        if (!list.length) return 0;
        try { world.terrain(JSON.stringify({ cells: list, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return list.length;
    }

    define({
        id: stormthrowId,
        cooldownParameter: "recharge",
        name: "Storm Throw",
        description: "贴身抓住一个对手，借势把它掀翻砸在地上，造成必定击中要害的格斗属性接触伤害，并短暂把它压住（无法开始新动作、移动变慢）；落点砸出翻起的碎土。锁摔压得更久，急摔打得更重。",
        uses: ["点掉贴身的单个目标", "摔翻扑上来的近身威胁并短暂压制", "在窄口砸出一片翻起的碎土"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.8,
        prepare: 10,
        active: 1,
        recover: 9,
        cooldown: 60,
        style: "throw",
        defaults: { pin: false, ai: { maxChase: 6, grapple: true, finish: true } },
        fields: [flag("pin", "锁摔")],
        indicator: function (config, pokemon) {
            return { radius: p(stormthrowId, "reach", pokemon), geometry: "circle", style: "throw", color: 0xC98B3A,
                label: config && config.pin === true ? "山岚摔·锁摔" : "山岚摔·急摔" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stormthrowId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(stormthrowId, "tempo", context)),
                recover: Math.round(p(stormthrowId, "aftercast", context)),
                cooldown: Math.round(p(stormthrowId, "recharge", context)),
                active: 1,
                range: p(stormthrowId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("stormthrow:crouch", stormthrowScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, scale: scale, pin: !!(config && config.pin) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const target = action.target();
            const self = world.observe(actor);
            if (target === null || self === null || !world.valid(target)) {
                WorldFeedback.emit(world, stormthrowScene, 1, origin, { moment: "miss", scale: 1 }, 18);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), stormthrowMissText, [], 22);
                done(action);
                return;
            }

            const grabbed: CombatActor = target;
            const victim = world.observe(grabbed);
            if (victim === null) { done(action); return; }
            const power = p(stormthrowId, "slam", action);
            const grip = Math.max(1.6, p(stormthrowId, "reach", action));
            const crush = Math.max(0.2, p(stormthrowId, "crush", action));
            const staggerTicks = Math.max(12, Math.round(p(stormthrowId, "staggerTicks", action)));
            const scar = Math.max(4, Math.round(p(stormthrowId, "scar", action)));
            const scarTicks = Math.max(40, Math.round(p(stormthrowId, "scarTicks", action)));
            const dust = Math.max(10, Math.round(p(stormthrowId, "dust", action)));
            const scale = (self.width() + self.height()) / 2.3;
            const intensity = Math.max(0.6, Math.min(2.2, power / 56));
            const from = victim.position();
            const delta = from.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 0.05 ? action.direction() : flat.unit();
            const gap = flat.length();

            // 抓取前先贴身半步；对手在抓取距离之外就抓空。
            if (gap > grip) {
                const step = Math.min(1.3, gap - grip * 0.7);
                if (step > 0.05) world.displace(actor, heading.scale(step));
            }
            const after = world.observe(grabbed);
            if (after === null || after.position().minus(world.observe(actor)!.position()).length() > grip + 1.0) {
                WorldFeedback.emit(world, stormthrowScene, 1, from, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), stormthrowMissText, [], 22);
                done(action);
                return;
            }

            action.face(from, 20, 20);
            sound(action, "minecraft:entity.ravager.step");
            WorldFeedback.emit(world, stormthrowScene, 1, from,
                { moment: "grab", target: String(grabbed.ref()), dust: dust, scale: scale, intensity: intensity }, 20);

            let settled = false;
            action.after(3, function (current) {
                const scope = current.world();
                const now = scope.observe(grabbed);
                if (now === null) { if (!settled) { settled = true; done(current); } return; }
                const landed = hurt(current, grabbed, stormthrowId, power,
                    { damage: damageSpec(stormthrowId, "slam"), critical: true, contact: true });
                const at = now.position();
                const away = at.minus(origin);
                const push = WorldCombat.point(away.x(), 0, away.z());
                const shove = push.length() < 0.05 ? heading : push.unit();
                if (scope.valid(grabbed)) scope.displace(grabbed, shove.scale(crush * 0.5).plus(WorldCombat.point(0, -crush * 0.4, 0)));
                if (landed) {
                    CombatStatus.apply(scope, grabbed, "stagger", stormthrowStaggerEffect, staggerTicks, 0, { unique: true });
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), stormthrowStaggerText, [Math.round(staggerTicks / 2) / 10], 24);
                }
                const ground = scope.observe(grabbed);
                const scarAt = ground === null ? at : ground.position();
                const cells = stormthrowScar(scope, scarAt, scar, scarTicks);
                WorldFeedback.emit(scope, stormthrowScene, 1, scarAt,
                    { moment: "slam", target: String(grabbed.ref()), dust: dust, cells: cells, scale: scale, intensity: intensity }, 26);
                scope.sound("minecraft:item.mace.smash_ground_heavy", scarAt, 16, "{}");
                if (landed) scope.sound("cobblemon:impact.fighting", scarAt, 14, "{}");
                if (!settled) { settled = true; done(current); }
            });
        }
    });

    // 共享摔翻身份的门禁：带着 stagger 的人在窗口内不能开始新动作；伤害阶段不受影响（仍可被打）。
    CombatStatus.actions.define({ id: "world_combat:stormthrow/stagger-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "stagger")) context.blocked.staggered = true;
    } });
}
