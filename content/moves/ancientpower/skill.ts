/**
 * 原始之力 / ancientpower —— 注册与动作。
 *
 * 核心念头：把大地深处的古力按进地里，一圈琥珀色古能贴着地面炸开、上顶成半球，把方圆之内的敌人一起轰开；
 *   散开的余波有概率灌回自身，把五项战斗能力各抬一级。它连空中的目标一起罩住——古力不是地震。
 *
 * 三幕：
 *   起（charge，提交前）：脚下裂出一圈将被撑开的古纹，只播预告，是周围对手走出范围的窗口。
 *   爆（erupt → hit）：提交后古能从脚下炸开，`reach` 半径的半球内每个非友方各结算一次 `primal` 特殊伤害，
 *       沿背离中心方向被推开 `push` 格、向上托起 `lift` 格；地面浮起一圈符文。
 *   涌（surge / fade）：冲击散开后掷一次反哺，成功则攻击、防御、特攻、特防、速度各升 `surgeStages` 级，
 *       失败只留余尘。
 *
 * 配置 `deep`（深源式）由 resolve 改时序、由公式改半径／威力／反哺：开启＝窄而重、更稳，关闭＝广而快。
 */
namespace PokemonSkills {
    const ancientpowerScene = "world_combat:move_ancientpower";
    const ancientpowerSurgeText = "world_combat.move.ancientpower.text.surge";
    const ancientpowerHitText = "world_combat.move.ancientpower.text.hit";
    const ancientpowerMissText = "world_combat.move.ancientpower.text.miss";

    define({
        id: "ancientpower",
        cooldownParameter: "recharge",
        name: "Ancient Power",
        description: "把大地的原始之力从脚下按开：一圈古能半球把周围（含空中）的敌人一起轰开、向外推开并向上托起，地面浮起地缘符文；散开的余波有概率把自身五项战斗能力短时各抬一级。深源式窄而重、更稳；广域式宽而快、推得更远。",
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
            action.present("ancientpower:charge", ancientpowerScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", radius: p("ancientpower", "reach", action),
                    deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
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

            sound(action, "minecraft:block.ancient_debris.break");
            WorldFeedback.emit(world, ancientpowerScene, 1, centre,
                { moment: "erupt", radius: radius, band: band, shards: shards, runes: runes, scale: scale, intensity: intensity }, 30);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: band, above: band }), function (enemy, facts) {
                if (String(enemy.ref()) === String(actor.ref())) return;
                if (!hurt(action, enemy, "ancientpower", power, { damage: damageSpec("ancientpower", "primal") })) return;
                hits++;
                const away = facts.position().minus(centre);
                if (world.valid(enemy) && away.length() > 0.05)
                    world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push).plus(WorldCombat.point(0, lift, 0)));
                WorldFeedback.emit(world, ancientpowerScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), radius: radius, shards: shards, scale: scale, intensity: intensity }, 24);
            });

            if (hits === 0) {
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), ancientpowerMissText, [], 22);
                WorldFeedback.emit(world, ancientpowerScene, 1, centre, { moment: "fade", radius: radius, scale: scale }, 20);
                done(action);
                return;
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), ancientpowerHitText, [hits], 24);

            if (world.random() < chance && world.valid(actor)) {
                const window = Math.max(1, Math.round(p("ancientpower", "surgeTicks", action)));
                const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
                world.effects(actor, definition).forEach(function (view) {
                    const data = JSON.parse(String(view.data()));
                    if (data.source === "world_combat:move/ancientpower") NativeEffects.windowClose(world, view.id());
                });
                NativeEffects.boostWindow(world, actor, { atk: stages, def: stages, spa: stages, spd: stages, spe: stages }, window, "world_combat:move/ancientpower");
                const self = world.observe(actor);
                const at = self === null ? centre : self.position();
                WorldFeedback.emit(world, ancientpowerScene, 1, at,
                    { moment: "surge", target: String(actor.ref()), stages: stages, radius: radius, shards: shards, scale: scale }, 28);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, self === null ? 1.4 : self.height() + 0.1, 0)),
                    ancientpowerSurgeText, [stages, Math.round(window / 20)], 30);
                world.sound("minecraft:block.beacon.power_select", at, 18, "{}");
            }
            done(action);
        }
    });
}
