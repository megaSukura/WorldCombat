/**
 * 手下留情 / holdback 的出手方式。
 *
 * 核心念头：**抡圆一记本该扫倒一排的重击，在碰到之前收住力道**——从所有人身上擦过去，谁都没倒。
 *
 * 两幕：
 *   起（windup，提交前）：沉身开肩，把这一扫的力道抡到最大。
 *   扫（sweep → strike，提交后）：朝身前 `reach` 半径、`angle` 半角的扇形扫出一记接触横扫，扇面里的非友方各挨一下；
 *       每个目标在结算前都被 `world_combat:holdback_mercy` 截停在「至少剩 1 HP」，所以谁都不会被扫倒。
 *       沉腰式扫完后，收势把施法者自己钉住 `brace` 刻。
 *
 * 与同族分开：点到为止是单点精准的细切；手下留情是一道宽扇形横扫，能同时留手好几个，慢而宽。
 *
 * 配置 `heavy`（沉腰）由 resolve 改时序、由公式改威力／扫距／扇形：开启＝更宽更沉、扫完要沉腰；关闭＝快扫、可立刻移动。
 */
namespace PokemonSkills {
    const holdbackId = "holdback";
    const holdbackScene = "world_combat:move_holdback";
    const holdbackMercy = "world_combat:holdback_mercy";
    const holdbackSpareText = "world_combat.move.holdback.text.spare";
    const holdbackMissText = "world_combat.move.holdback.text.miss";

    /** 拦截这一扫的致命数值：每个被扫中的目标都在结算前截到「至少剩 1 HP」。 */
    WorldCombat.effect(holdbackMercy, 1, 40, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(holdbackMercy, "start", function (effect) {
        effect.listen("world_combat:incoming", "world_combat:intercept", "intercept");
    });
    WorldCombat.effectHandler(holdbackMercy, "intercept", function (effect) {
        const event = effect.event();
        if (String(event.target().key()) !== String(effect.target().key())) return;
        if (String(event.source().key()) !== String(effect.source().key())) return;
        const data = JSON.parse(String(event.payload()));
        if (String(data.move) !== holdbackId || !(data.amount > 0)) return;
        const world = effect.world(), body = world.observe(effect.target());
        if (body === null) { effect.end(); return; }
        const cap = Math.max(0, body.health() - 1);
        if (data.amount > cap) { data.amount = cap; data.mercy = true; event.payload(JSON.stringify(data)); }
        effect.end();
    });

    /** 扇形扇面顶点：从 origin 起，绕朝向张开 angle 半角、半径 reach；判定与表现共用同一组点。 */
    function holdbackArc(origin: CombatPoint, direction: CombatPoint, reach: number, angle: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const base = Math.atan2(heading.x(), heading.z()), points: number[][] = [[origin.x(), origin.y() + 0.5, origin.z()]];
        for (let step = 0; step <= 10; step++) {
            const theta = base + (-angle + 2 * angle * step / 10) * Math.PI / 180;
            points.push([origin.x() + Math.sin(theta) * reach, origin.y() + 0.5, origin.z() + Math.cos(theta) * reach]);
        }
        return points;
    }

    define({
        id: holdbackId,
        cooldownParameter: "recharge",
        name: "Hold Back",
        description: "朝身前扇形扫出一记收着力气的横扫：扇面里的所有非友方都只会削血，目标至少留下 1 HP。沉腰式更宽更沉、扫完要沉腰；快扫更快更轻。",
        uses: ["一次把几个目标都削到低血便于捕捉", "在混战里同时压制而不打倒任何人", "替队友留活口、控制场面"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.4,
        prepare: 9,
        active: 16,
        recover: 8,
        cooldown: 28,
        style: "slash",
        defaults: { heavy: false, ai: { maxChase: 7, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(holdbackId, "reach", pokemon), geometry: "cone", style: "slash",
                color: 0xEDE0C8, label: config && config.heavy === true ? "沉腰手下留情" : "快扫手下留情" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[holdbackId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(holdbackId, "tempo", context)),
                recover: Math.round(p(holdbackId, "aftercast", context)),
                cooldown: Math.round(p(holdbackId, "recharge", context)),
                active: skills[holdbackId].active,
                range: p(holdbackId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_holdback:windup", holdbackScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const reach = p(holdbackId, "reach", action);
            const angle = p(holdbackId, "angle", action);
            const depth = p(holdbackId, "depth", action);
            const power = p(holdbackId, "sweep", action);
            const dust = Math.max(10, Math.round(p(holdbackId, "dust", action)));
            const brace = Math.max(0, Math.round(p(holdbackId, "brace", action)));
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const scale = Math.max(0.6, Math.min(2.0, reach / 2.6));
            const intensity = Math.max(0.6, Math.min(2.4, power / 50));
            const path = holdbackArc(origin, direction, reach, angle);
            let hits = 0, totalDust = 0;

            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, reach, angle, { below: 0.8, above: depth }),
                function (victim, facts) {
                    world.effect(holdbackMercy, victim, "{}", 12);
                    if (!hurt(action, victim, holdbackId, power, { damage: damageSpec(holdbackId, "sweep"), contact: true })) return;
                    hits++;
                    totalDust += dust;
                    WorldFeedback.emit(world, holdbackScene, 1, facts.position(),
                        { moment: "strike", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 18);
                });

            WorldFeedback.emit(world, holdbackScene, 1, origin,
                { moment: "sweep", path: path, dust: dust, hits: hits, angle: angle, depth: depth,
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 22);
            sound(action, "minecraft:entity.player.attack.sweep");
            if (brace > 0) world.effect("world_combat:rooted", actor, "{}", brace);
            if (hits === 0) {
                WorldFeedback.emit(world, holdbackScene, 1, origin.plus(direction.scale(reach)), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(direction.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), holdbackMissText, [], 20);
            }
            done(action);
        }
    });

    // 收手标记：任一被扫中的目标保住了 1 HP 时，在它身上补一记收手标记与浮字。
    WorldCombat.on("world_combat:move_holdback/spare", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== holdbackId || data.mercy !== true) return;
        const world = event.world(), target = event.target();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, holdbackScene, 1, at,
            { moment: "spare", target: String(target.ref()), sparks: Math.max(1, Math.round(Math.min(4, (data.before || 1) / 40 + 1))), scale: 1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), holdbackSpareText, [], 30);
        world.sound("minecraft:entity.player.attack.nodamage", at, 14, "{}");
    });
}
