/**
 * 胃液 / gastroacid — 执行组织。
 *
 * 三幕：
 *   涌（windup，提交前）：喉间涌起绿酸、冒着泡（`action.present` 预告，可被打断且不花代价）。
 *   吐（提交后）：一口酸弹沿瞄准方向飞出，弹体带酸滴尾迹（`LivingActions.projectile`，原生物理与碰撞）。
 *   蚀（命中后）：酸液炸开一大片，目标身上挂上共享身份 `world_combat:status/gastroacid` 的“沾酸”状态；
 *     若目标是宝可梦且特性可被压制，再写入 `NativeModifiers` 的 suppressAbility 层，把特性蚀掉同样长的时间。
 *     落点地面留一小滩酸渍（`world.terrain` 租借，到期原方块回来），能被看见、被绕开。
 *
 * 任何生物都会被酸溅到并带上“沾酸”身份；只有宝可梦有特性可被压制，因此对原版生物是纯标记与表现。
 * 目标特性带 cantsuppress 或已被压制时不重复吐（预检），不浪费 PP。
 * 配置项 thick（浓酸 / 稀酸）改变蚀刻时长与冷却。
 */
namespace PokemonSkills {
    export const gastroacidScene = "world_combat:move_gastroacid";
    export const gastroacidEffect = "world_combat:gastroacid";
    export const gastroacidSealText = "world_combat.move.gastroacid.text.sealed";
    export const gastroacidCoatText = "world_combat.move.gastroacid.text.coated";
    const gastroacidReferenceRadius = 0.3;

    /** 把目标的特性压制 hold 刻；目标不可压制时返回 false。 */
    function gastroacidSeal(world: CombatWorld, target: CombatActor, hold: number): boolean {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return false;
        if (!NativeModifiers.abilitySuppressible(world, target)) return false;
        NativeModifiers.apply(world, target, { suppressAbility: true }, hold);
        return true;
    }

    /** 在落点下方找第一块实心方块，换成一格酸渍；到期原方块回来。 */
    function gastroacidPuddle(world: CombatWorld, point: CombatPoint, ticks: number): boolean {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dy = 0; dy <= 4; dy++) {
            const y = base - dy, block = world.block(WorldCombat.point(x, y, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") return false;
            try {
                world.terrain(JSON.stringify({ cells: [{ x: x, y: y, z: z, block: "minecraft:lime_concrete" }], replace: true, linger: true }),
                    Math.max(40, Math.round(ticks)));
                return true;
            } catch (error) { return false; }
        }
        return false;
    }

    define({
        id: "gastroacid",
        name: "Gastro Acid",
        description: "将胃液吐向对手的身体，沾上的胃液会消除对手的特性效果。",
        uses: ["定点拆掉对手的强力特性", "压制威吓、飘浮一类持续生效的特性", "在落点地面留下一小滩酸渍"],
        kind: "enemy",
        range: 9,
        maxRange: 17,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 80,
        style: "acid",
        defaults: { thick: false, ai: { maxChase: 16, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["gastroacid"], detail: { values: config } };
            return { radius: p("gastroacid", "reach", context), geometry: "line", style: "acid", color: 0x9BE049, label: "胃液" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["gastroacid"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !!(config && config.thick);
            return {
                prepare: Math.round(p("gastroacid", "tempo", context)),
                recover: Math.round(p("gastroacid", "aftercast", context)),
                cooldown: Math.round(p("gastroacid", "recharge", context)) + (thick ? 22 : -12),
                active: 0,
                range: p("gastroacid", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("gastroacid", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, "gastroacid")) return "already-coated";
            if (String(target.domain()) === "cobblemon" && !NativeModifiers.abilitySuppressible(world, target)) return "no-effect";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:gastroacid:gather", gastroacidScene, 1, action.origin(), JSON.stringify({
                moment: "gather", bubbles: p("gastroacid", "bubbles", action),
                thick: config && config.thick ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const thickness = !!(config && config.thick);
            const velocity = p("gastroacid", "velocity", action);
            const radius = Math.max(0.15, p("gastroacid", "radius", action));
            const hold = Math.max(40, Math.round(p("gastroacid", "hold", action)));
            const drops = Math.max(8, Math.round(p("gastroacid", "drops", action)));
            const bubbles = Math.max(6, Math.round(p("gastroacid", "bubbles", action)));
            const puddle = Math.max(40, Math.round(p("gastroacid", "puddle", action)));
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            const body = world.observe(actor);
            const from = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0));
            const aimed = action.targetPosition().minus(from);
            const base = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            const scale = radius / gastroacidReferenceRadius;
            const intensity = Math.max(0.7, Math.min(2, hold / 200));
            let settled = false;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), gastroacidScene, 1, current.origin(),
                    { moment: "settle", target: targetRef, drops: drops }, 24);
                done(current);
            }
            function corrode(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), target = impact.target(), point = impact.position();
                if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                    const sealed = gastroacidSeal(scope, target, hold);
                    MobEffects.apply(scope, target, gastroacidEffect, hold, thickness ? 1 : 0);
                    const at = scope.observe(target);
                    if (at !== null) {
                        WorldFeedback.emit(scope, gastroacidScene, 1, at.position(),
                            { moment: "corrode", target: String(target.ref()), drops: drops, thick: thickness ? 1 : 0,
                                intensity: intensity, scale: scale }, 32);
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)),
                            sealed ? gastroacidSealText : gastroacidCoatText, [], 34);
                    }
                }
                WorldFeedback.emit(scope, gastroacidScene, 1, point,
                    { moment: "splash", drops: drops, scale: scale, intensity: intensity }, 26);
                gastroacidPuddle(scope, point, puddle);
                sound(current, "minecraft:entity.generic.splash");
                finish(current);
            }
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, lifetime: 160,
                direction: base,
                appearance: { sprite: "cobblemon:particle/generic/goo/acidsplash", scale: Math.max(0.7, scale),
                    tint: 0x9BE049, homing: targetRef === "" ? undefined : { target: targetRef, turn: 5, delay: 1, range: action.range() } },
                impact: corrode
            }, finish);
            WorldFeedback.emit(world, gastroacidScene, 1, from,
                { moment: "spit", projectile: flight, bubbles: bubbles, scale: scale, intensity: intensity }, 40);
            sound(action, "minecraft:entity.llama.spit");
        }
    });
}
