/**
 * 硬压 / hardpress 的出手方式。
 *
 * 念头的形状：抬臂／抬钳（brace，提交前只播预告）→ 一腕沿身前**近身短矩形掌面**压下去（press）→
 *   掌面里每个非友方吃一记随「目标完整度」结算的 `press`，被向下压 `sink`（向下速度）、沿背离掌心的方向顶开 `shove`
 *   → 压柱收束带起碎屑。
 * 只有一幕正戏：一次下压、一个结果，做透这一下就是全部。掌面就铺在脚前：朝瞄准方向伸 `reach` 长、左右各 `radius` 半宽，
 *   判定与画面共用同一块矩形；站在掌面外的目标只是看着它压空。双腕式把左右半宽摊开（罩住并排站的敌人），
 *   代价是单点威力更轻；不再额外拖长起手与冷却。单腕式更窄更重、更快。
 * 掌面落在真实表面上：朝前先取第一块方块的接触点，墙会把掌长截短、墙后的目标压不到；再从掌面中心向下探出第一个
 *   可站的顶面（`blockFace() === "up"`），用它的实际 `position()` 当落点。命中判定与 press 画面共用这组实际 position。
 * 选取 `kind: "aim"`：接受任意阵营实体或方向／世界点，可对空地空放；没有目标时沿提交朝向照压，不要求存在敌人。
 *   攻击许可仍由命中层按敌我结算。
 * 提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    const hardpressHitText = "world_combat.move.hardpress.text.press";
    const hardpressMissText = "world_combat.move.hardpress.text.miss";

    /** 掌面四角：从脚前沿朝向铺 `reach` 长、左右各 `radius` 半宽；判定 `WorldGeometry.box` 与表现同这组顶点。 */
    function hardpressFace(origin: CombatPoint, heading: CombatPoint, reach: number, radius: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        return [origin.plus(side.scale(radius)), origin.plus(side.scale(-radius)),
            origin.plus(heading.scale(reach)).plus(side.scale(-radius)), origin.plus(heading.scale(reach)).plus(side.scale(radius))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 墙截掌面：中心线朝前的第一块方块把掌长收短，墙后的目标不再被算入。 */
    function hardpressReach(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, reach: number): number {
        const wall = WorldGeometry.blockHit(world, origin, origin.plus(heading.scale(reach)));
        return wall === null ? reach : Math.max(0.4, Math.min(reach, wall.position().minus(origin).length()));
    }

    /** 掌面中心向下探到的可站顶面（真实接触点 `position()`）；没有顶面时返回 null，表示压在空中。 */
    function hardpressGround(world: CombatWorld, centre: CombatPoint, up: number, down: number): CombatPoint | null {
        const hit = WorldGeometry.blockHit(world, centre.plus(WorldCombat.point(0, up, 0)), centre.minus(WorldCombat.point(0, down, 0)));
        return hit !== null && hit.blockFace() === "up" ? hit.position() : null;
    }

    define({
        id: hardpressId,
        cooldownParameter: "recharge",
        name: "Hard Press",
        description: "抬臂／抬钳，沿身前一小片掌面把对手向下压：物攻与体重决定这一压的分量，对手此刻剩余的生命越满，威力越大——对手已经残了，这一下就轻。它是三压招里起手最快、冷却最短的一记，靠一记接一记地压；双腕式把掌面左右摊开、一次罩住并排站的几个目标，但单点更轻，节奏不变。",
        uses: ["开局对满血的目标压出最重的一记", "双腕式一次按住并排站的几个敌人", "用最快的循环一记接一记地压住对手"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.4,
        prepare: 7,
        active: 16,
        recover: 6,
        cooldown: 22,
        style: "press",
        defaults: { brace: false, ai: { maxChase: 6, preferHealthy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(hardpressId, "reach", pokemon) + 0.2, geometry: "line", style: "press",
                color: 0x9FB6C8, label: config && config.brace === true ? "硬压 · 双腕式" : "硬压 · 单腕式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hardpressId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(hardpressId, "tempo", context)),
                recover: Math.round(p(hardpressId, "aftercast", context)),
                cooldown: Math.round(p(hardpressId, "recharge", context)),
                active: skills[hardpressId].active,
                range: p(hardpressId, "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            // 准备期就把这次真正要落下的掌面举到高处，让玩家看见它随后压下去的落差。
            const sense = action.sense();
            const body = sense.observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const values = { world: sense, actor: action.actor(), detail: { values: config } };
            const reach = Math.max(1.0, p(hardpressId, "reach", values));
            const radius = Math.max(0.4, p(hardpressId, "pressRadius", values));
            const lift = body === null ? 1.6 : Math.max(1.0, body.height() * 1.15);
            const base = WorldCombat.point(origin.x(), origin.y() + lift, origin.z());
            action.present("world_combat:move_hardpress:brace", hardpressScene, 1, base,
                JSON.stringify({ moment: "brace", brace: config && config.brace === true ? 1 : 0, windup: prepare,
                    path: hardpressFace(base, heading, reach, radius), reach: reach, radius: radius, scale: radius / hardpressReference }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const power = p(hardpressId, "press", action);
            const radius = Math.max(0.4, p(hardpressId, "pressRadius", action));
            const reach = Math.max(1.0, p(hardpressId, "reach", action));
            const sink = Math.max(0, p(hardpressId, "sink", action));
            const shove = Math.max(0, p(hardpressId, "shove", action));
            const motes = Math.max(8, Math.round(p(hardpressId, "motes", action)));
            const intensity = Math.max(0.6, Math.min(2.2, power / 90));
            const scale = radius / hardpressReference;
            const brace = !!(config && config.brace);
            // 近身掌面：墙把掌长截短；掌面中心向下探到可站顶面，落点用其实际接触点 position()。
            const span = hardpressReach(world, origin, heading, reach);
            const centre = origin.plus(heading.scale(span * 0.5));
            const contact = hardpressGround(world, centre, 0.6, 3.0);
            const groundY = contact === null ? origin.y() : contact.y();
            const face = hardpressFace(WorldCombat.point(origin.x(), groundY, origin.z()), heading, span, radius);
            const anchor = contact === null ? origin : contact;
            const region = WorldGeometry.box(centre, heading, WorldCombat.point(span * 0.5, 0, radius), { below: 2.4, above: 3.0 });
            let hits = 0;
            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                // 掌面只压它实际够得到的人：墙后的目标在这一口之外。
                if (!world.clear(anchor, facts.position())) return;
                // 先读命中当刻的血量比，再结算伤害：压痕与伤害读同一个「这个人还剩多少」。
                const pressure = hardpressRatioNow(world, victim);
                const landed = hurt(action, victim, hardpressId, power,
                    { damage: damageSpec(hardpressId, "press"), contact: true });
                if (!landed) return;
                hits++;
                const body = world.observe(victim);
                // sink 是向下速度：空中的目标被压下去落，地面上的目标被地面挡住，不承诺穿土。
                if (body !== null && sink > 0) world.motion(victim, WorldCombat.point(0, -sink, 0), false);
                const away = facts.position().minus(centre);
                if (body !== null && away.length() >= 0.05) world.hitDisplace(victim, away.unit().scale(shove));
                WorldFeedback.emit(world, hardpressScene, 1, body === null ? facts.position() : body.position(),
                    { moment: "impact", target: String(victim.ref()), motes: motes, pressure: pressure,
                        mark: Math.round((0.22 + pressure * 0.5) * 100) / 100, intensity: intensity }, 26);
            });
            // press 的掌面顶点是掌面中心落在真实表面上的位置，与服务端 box 判定同宽同长。
            WorldFeedback.emit(world, hardpressScene, 1, centre,
                { moment: "press", path: face, motes: motes, scale: scale, sink: sink, hits: hits, direction: [heading.x(), heading.y(), heading.z()],
                    brace: brace ? 1 : 0, intensity: intensity }, 32);
            sound(action, brace ? "minecraft:item.mace.smash_ground_heavy" : "minecraft:item.mace.smash_ground");
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.35, 0)),
                hits > 0 ? hardpressHitText : hardpressMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
