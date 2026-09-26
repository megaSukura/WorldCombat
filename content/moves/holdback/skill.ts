/**
 * 手下留情 / holdback 的出手方式。
 *
 * 核心念头：**抡圆一记本该扫倒一排的重击，在碰到之前收住力道**——从所有人身上擦过去，谁都没倒。
 *
 * 两幕：
 *   起（windup，提交前）：沉身开肩，把这一扫的力道抡到最大。
 *   扫（sweep → strike，提交后）：`kind: "aim"`——朝任意方向或世界点扫出一记接触横扫，扇形张角 `angle` 是
 *       **总张角**，判定与画面共用同一个数；扇面里的非友方各挨一下，但被实墙挡住的挥臂够不到的目标不结算
 *       （`world.clear` 沿真实刀路挡刀）。每个目标都用本次伤害自带的 `minimumHealth: 1` 截停，所以谁都不会被扫倒。
 *       沉腰式扫完后，收势把施法者自己钉住 `brace` 刻。
 *
 * 与同族分开：点到为止是单点精准的细切；手下留情是一道宽扇形横扫，能同时留手好几个，慢而宽。
 *
 * 配置 `heavy`（沉腰）由 resolve 改时序、由公式改威力／扫距／扇形：开启＝更宽更沉、扫完要沉腰；关闭＝快扫、可立刻移动。
 */
namespace PokemonSkills {
    const holdbackId = "holdback";
    const holdbackScene = "world_combat:move_holdback";
    const holdbackSpareText = "world_combat.move.holdback.text.spare";
    const holdbackMissText = "world_combat.move.holdback.text.miss";

    /** 扇形扇面顶点：从 origin 起，绕朝向张开 `angle` **总张角**、半径 reach；判定与表现共用同一组点。 */
    function holdbackArc(origin: CombatPoint, direction: CombatPoint, reach: number, angle: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const half = Math.max(0, Math.min(360, angle)) * Math.PI / 360;
        const base = Math.atan2(heading.x(), heading.z()), points: number[][] = [[origin.x(), origin.y() + 0.5, origin.z()]];
        for (let step = 0; step <= 10; step++) {
            const theta = base + (-half + 2 * half * step / 10);
            points.push([origin.x() + Math.sin(theta) * reach, origin.y() + 0.5, origin.z() + Math.cos(theta) * reach]);
        }
        return points;
    }

    define({
        freeMovement: function (config) { return !!config.heavy; },
        id: holdbackId,
        cooldownParameter: "recharge",
        name: "Hold Back",
        description: "朝身前扇形扫出一记收着力气的横扫：扇面里的所有非友方都只会削血，目标至少留下 1 HP。张角就是画面真正扫开的范围，实墙会挡住挥臂够不到的目标。沉腰式更宽更沉、扫完要沉腰；快扫更快更轻。",
        uses: ["一次把几个目标都削到低血便于捕捉", "在混战里同时压制而不打倒任何人", "替队友留活口、控制场面"],
        kind: "aim",
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
            let hits = 0;

            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, reach, angle, { below: 0.8, above: depth }),
                function (victim, facts) {
                    // 实墙挡住挥臂：挡刀线过不去就不结算，扇边可见范围与判定一致。
                    if (!world.clear(origin, facts.position())) return;
                    if (!hurt(action, victim, holdbackId, power,
                        { damage: damageSpec(holdbackId, "sweep"), contact: true, minimumHealth: 1 })) return;
                    hits++;
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

    // 收手标记：每个真正被 1 HP 下限截停、保住了 1 HP 的目标，在它身上补一记收刃星与浮字。
    // 读 damage_applied 的实际结果（after <= 1），不把「伤害被接受」当成「到达 1 HP」。
    WorldCombat.on("world_combat:move_holdback/spare", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== holdbackId || !(data.actual > 0)) return;
        if (typeof data.after !== "number" || data.after > 1) return;
        const world = event.world(), target = event.target();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, holdbackScene, 1, at,
            { moment: "spare", target: String(target.ref()), sparks: Math.max(1, Math.round(Math.min(4, (data.before || 1) / 40 + 1))), scale: 1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), holdbackSpareText, [], 30);
        world.sound("minecraft:entity.player.attack.nodamage", at, 14, "{}");
    });
}
