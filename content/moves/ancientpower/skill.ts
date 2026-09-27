/**
 * 原始之力 / ancientpower —— 注册与动作。
 *
 * 核心念头：把大地深处的古力按进地里，一圈琥珀色古能贴着地面炸开、沿身体中心撑起一道圆柱高度带，把方圆之内的敌人一起轰开；
 *   散开的余波有概率灌回自身，把五项战斗能力各抬一级。它连空中的目标一起罩住——古力不是地震。
 *
 * 三幕：
 *   起（charge，提交前）：脚面裂出一圈将被撑开的古纹，只播预告，是周围对手走出范围的窗口。
 *   爆（erupt → hit）：提交后古能从脚面炸开，以身体中心为轴、`reach` 半径、`band` 上下高度的圆柱内每个非友方
 *       各结算一次 `primal` 特殊伤害；命中与 AI 用同一套 BLOCK 遮挡定义，墙后的目标不被波及。水平外推与向上托起
 *       分别按真实向量构造，头顶正上方的目标也拿到合法的向上分量，位移走原生受击入口，实际挪动多少由地形与击退抗性决定。
 *   涌（surge / fade）：冲击散开后掷一次反哺。五项能力此刻才真正写入窗口；只按本次实际提高的项反馈，
 *       并区分“新得”与“刷新”，把持续符文绑在这个窗口上，窗口自然到期或被清除时符文一起收。窗口只保留一层。
 *
 * `kind: "self"`：以自身为中心，不要求选中敌人；AI 只把真正落在半径与上下高度内、视线可达的敌人计入圈内。
 */
namespace PokemonSkills {
    const ancientpowerScene = "world_combat:move_ancientpower";
    const ancientpowerSurgeText = "world_combat.move.ancientpower.text.surge";
    const ancientpowerRefreshText = "world_combat.move.ancientpower.text.refresh";
    const ancientpowerHitText = "world_combat.move.ancientpower.text.hit";
    const ancientpowerMissText = "world_combat.move.ancientpower.text.miss";

    define({
        id: "ancientpower",
        cooldownParameter: "recharge",
        name: "Ancient Power",
        description: "把大地的原始之力从脚下按开：一圈古能沿身体中心撑成圆柱高度带，把周围（含空中）的敌人一起轰开、向外推开并向上托起，脚面浮起地缘符文；散开的余波有概率把自身五项战斗能力短时各抬一级。深源式窄而重、更稳；广域式宽而快、推得更远。",
        uses: ["被围住时一次轰开一圈人", "连空中的目标一起罩住，不只是地面", "抓住反哺后的短时强化窗口进攻"],
        kind: "self",
        range: 3.4,
        maxRange: 5.6,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "primal",
        defaults: { deep: false, ai: { maxChase: 7, minFoes: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("ancientpower", "reach", pokemon), geometry: "area", style: "primal", color: 0xC8A24A,
                label: config && config.deep === true ? "深源式" : "原始之力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["ancientpower"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("ancientpower", "tempo", context)),
                recover: Math.round(p("ancientpower", "aftercast", context)),
                cooldown: Math.round(p("ancientpower", "recharge", context)),
                active: 0,
                range: p("ancientpower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense();
            const body = world.observe(action.actor());
            const centre = action.origin();
            const radius = Math.max(2.4, p("ancientpower", "reach", action));
            const foot = body === null ? centre : WorldCombat.point(centre.x(), centre.y() - body.height() / 2, centre.z());
            action.present("ancientpower:charge", ancientpowerScene, 1, foot,
                JSON.stringify({ moment: "charge", radius: radius, scale: Math.max(0.6, Math.min(2.4, radius / 3.4)),
                    deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            // 地面符文与震波落在施法者脚面；体积冲击仍取身体中心的高度带。
            const foot = body !== null ? WorldCombat.point(centre.x(), centre.y() - body.height() / 2, centre.z())
                : WorldCombat.point(centre.x(), centre.y() - 0.7, centre.z());
            const bodyLift = centre.y() - foot.y();
            const radius = Math.max(2.4, p("ancientpower", "reach", action));
            const band = Math.max(1.1, p("ancientpower", "band", action));
            const power = p("ancientpower", "primal", action);
            const push = p("ancientpower", "push", action);
            const lift = p("ancientpower", "lift", action);
            const chance = Math.max(0.02, Math.min(0.9, p("ancientpower", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("ancientpower", "surgeStages", action)));
            const shards = Math.max(12, Math.round(p("ancientpower", "shards", action)));
            const runes = Math.max(6, Math.round(p("ancientpower", "runes", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 3.4));
            const intensity = Math.max(0.5, Math.min(2.4, power / 62));
            const ring = Math.max(0.9, Math.min(2.6, radius * 0.42));

            sound(action, "minecraft:block.ancient_debris.break");
            WorldFeedback.emit(world, ancientpowerScene, 1, foot,
                { moment: "erupt", radius: radius, band: band, bandHeight: band * 2, bodyLift: bodyLift,
                  shards: shards, runes: runes, scale: scale, intensity: intensity }, 30);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: band, above: band }), function (enemy, facts) {
                if (String(enemy.ref()) === String(actor.ref())) return;
                const point = facts.position();
                // 与 AI 同一命中定义：以 BLOCK 遮挡为准，墙后的目标不被古力波及。
                if (!world.clear(centre, point)) return;
                if (!hurt(action, enemy, "ancientpower", power, { damage: damageSpec("ancientpower", "primal") })) return;
                hits++;
                // 水平外推与向上托起分别构造：头顶正上方的目标水平分量为零，仍拿到合法的向上分量而不是零向量。
                const away = facts.position().minus(centre);
                const flat = WorldCombat.point(away.x(), 0, away.z());
                const outward = flat.length() > 0.05 ? flat.unit().scale(push) : WorldCombat.point(0, 0, 0);
                const delta = outward.plus(WorldCombat.point(0, lift, 0));
                if (world.valid(enemy) && delta.length() > 0.01) world.hitDisplace(enemy, delta);
                WorldFeedback.emit(world, ancientpowerScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), radius: radius, shards: shards, scale: scale, intensity: intensity }, 24);
            });

            if (hits === 0) {
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), ancientpowerMissText, [], 22);
                WorldFeedback.emit(world, ancientpowerScene, 1, foot, { moment: "fade", radius: radius, scale: scale }, 20);
                done(action);
                return;
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), ancientpowerHitText, [hits], 24);

            if (world.random() < chance && world.valid(actor)) {
                const window = Math.max(1, Math.round(p("ancientpower", "surgeTicks", action)));
                const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
                // 窗口只保留一层：先按本招来源结束旧窗口，再写入这一次；旧窗存在即算刷新。
                let refreshed = false;
                world.effects(actor, definition).forEach(function (view) {
                    const data = JSON.parse(String(view.data()));
                    if (data.source === "world_combat:move/ancientpower") { refreshed = true; NativeEffects.windowClose(world, view.id()); }
                });
                const before = NativeEffects.effectiveStages(world, actor);
                const windowId = NativeEffects.boostWindow(world, actor, { atk: stages, def: stages, spa: stages, spd: stages, spe: stages },
                    window, "world_combat:move/ancientpower");
                if (windowId > 0) {
                    const after = NativeEffects.effectiveStages(world, actor);
                    const rise: any = {};
                    let raised = 0, best = 0;
                    ["atk", "def", "spa", "spd", "spe"].forEach(function (stat) {
                        const gain = Math.max(0, Math.round((after[stat] || 0) - (before[stat] || 0)));
                        if (gain > 0) { rise[stat] = gain; raised++; if (gain > best) best = gain; }
                    });
                    if (raised > 0) {
                        const self = world.observe(actor);
                        const at = self === null ? centre : self.position();
                        const head = self === null ? centre.plus(WorldCombat.point(0, 1.4, 0))
                            : at.plus(WorldCombat.point(0, self.height() + 0.1, 0));
                        // 持续符文绑在这次真正的能力窗口上：窗口到期或被清除会同步收回。
                        WorldFeedback.onEffect(world, windowId, "world_combat:move_ancientpower/runes", ancientpowerScene, 1, at,
                            { moment: "hum", rise: rise, runes: runes, ring: ring, scale: scale });
                        WorldFeedback.emit(world, ancientpowerScene, 1, at,
                            { moment: "surge", target: String(actor.ref()), rise: rise, stages: best, radius: radius, shards: shards, scale: scale }, 28);
                        WorldFeedback.text(world, head, refreshed ? ancientpowerRefreshText : ancientpowerSurgeText,
                            [raised, best, Math.round(window / 20)], 30);
                        world.sound("minecraft:block.beacon.power_select", at, 18, "{}");
                    }
                }
            }
            done(action);
        }
    });
}
