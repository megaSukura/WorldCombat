/**
 * 银色旋风 / silverwind —— 注册与动作。
 *
 * 核心念头：抖翅把银鳞扇成一大片向前铺开、缓缓往前飘，站在扇面里的敌人各被割一下；回卷的一撮鳞粉有概率
 *   落在自己身上，把五项战斗能力各抬一级。鳞粉是实物：走得慢、会被掩体挡住，飘完就落。
 *
 * 三幕：
 *   起（gather，提交前）：翅缘亮起银光、鳞粉朝翅上聚，只播预告。
 *   扇（blow → hit）：提交后把 `span` 度、`reach` 远的扇形向前铺满鳞粉；扇内每个非友方各结算一次 `gale`
 *       特殊伤害；鳞粉在空气里飘 `drift` 秒后落下，这段时间也是对手走出扇边的窗口。
 *   涌（surge / miss）：扇过之后掷一次反哺，成功则攻击、防御、特攻、特防、速度各升 `surgeStages` 级。
 *
 * 配置 `dense`（浓鳞式）由 resolve 改时序、由公式改扇面／威力／反哺：开启＝短而窄、更重更稳。
 */
namespace PokemonSkills {
    const silverwindScene = "world_combat:move_silverwind";
    const silverwindSurgeText = "world_combat.move.silverwind.text.surge";
    const silverwindHitText = "world_combat.move.silverwind.text.hit";
    const silverwindMissText = "world_combat.move.silverwind.text.miss";

    /** 扇面外缘的顶点（含圆心），交给表现用同一组顶点画同一个扇面。 */
    function silverwindFan(origin: CombatPoint, direction: CombatPoint, reach: number, span: number): number[][] {
        const base = Math.atan2(direction.x(), direction.z()), half = span * Math.PI / 360, steps = 8;
        const vertices: number[][] = [[origin.x(), origin.y() + 0.6, origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + (2 * half) * i / steps;
            vertices.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.6, origin.z() + Math.cos(angle) * reach]);
        }
        return vertices;
    }

    define({
        id: "silverwind",
        cooldownParameter: "recharge",
        name: "Silver Wind",
        description: "抖翅把银鳞扇成一大片向前铺开：扇面里的敌人各被割一下，鳞粉缓缓飘落后散尽；回卷的一撮鳞粉有概率把自身五项战斗能力短时各抬一级。浓鳞式短而窄、更重；疏鳞式铺得更远更宽、出手更快。",
        uses: ["一次割到并排站着的几个人", "在远一点的距离先手消耗", "抓住反哺后的短时强化窗口进攻"],
        kind: "enemy",
        range: 7.5,
        maxRange: 11,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 30,
        style: "scalewind",
        defaults: { dense: false, ai: { maxChase: 12, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("silverwind", "reach", pokemon), geometry: "cone", style: "scalewind", color: 0xC9D8E6,
                label: config && config.dense === true ? "浓鳞式" : "银色旋风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["silverwind"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("silverwind", "tempo", context)),
                recover: Math.round(p("silverwind", "aftercast", context)),
                cooldown: Math.round(p("silverwind", "recharge", context)),
                active: 0,
                range: p("silverwind", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("silverwind:gather", silverwindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", reach: p("silverwind", "reach", action),
                    span: p("silverwind", "span", action), dense: config && config.dense === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const direction = aim(action);
            const reach = Math.max(4, p("silverwind", "reach", action));
            const span = Math.max(40, p("silverwind", "span", action));
            const power = p("silverwind", "gale", action);
            const chance = Math.max(0.02, Math.min(0.9, p("silverwind", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("silverwind", "surgeStages", action)));
            const scales = Math.max(16, Math.round(p("silverwind", "scales", action)));
            const drift = Math.max(0.6, p("silverwind", "drift", action));
            const fan = silverwindFan(origin, direction, reach, span);
            const scale = Math.max(0.6, Math.min(2.2, reach / 7.5));
            const intensity = Math.max(0.5, Math.min(2.4, power / 62));
            const life = Math.max(30, Math.round(drift * 20) + 16);

            sound(action, "cobblemon:animation.chitin.wing_flap.medium");
            WorldFeedback.emit(world, silverwindScene, 1, origin,
                { moment: "blow", path: fan, span: span, reach: reach, scales: scales, drift: drift,
                  scale: scale, intensity: intensity }, life);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, reach, span, { below: 1.5, above: 2.8 }),
                function (victim, facts) {
                    if (String(victim.ref()) === String(actor.ref())) return;
                    if (!hurt(action, victim, "silverwind", power, { damage: damageSpec("silverwind", "gale") })) return;
                    hits++;
                    WorldFeedback.emit(world, silverwindScene, 1, facts.position(),
                        { moment: "hit", target: String(victim.ref()), scales: scales, scale: scale, intensity: intensity }, 22);
                });

            if (hits === 0) {
                WorldFeedback.text(world, origin.plus(direction.scale(reach * 0.6)).plus(WorldCombat.point(0, 1.0, 0)),
                    silverwindMissText, [], 22);
                WorldFeedback.emit(world, silverwindScene, 1, origin.plus(direction.scale(reach * 0.6)),
                    { moment: "miss", scales: Math.round(scales * 0.5), scale: scale }, 20);
                done(action);
                return;
            }
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), silverwindHitText, [hits], 26);

            if (world.random() < chance && world.valid(actor)) {
                const window = Math.max(1, Math.round(p("silverwind", "surgeTicks", action)));
                const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
                world.effects(actor, definition).forEach(function (view) {
                    const data = JSON.parse(String(view.data()));
                    if (data.source === "world_combat:move/silverwind") NativeEffects.windowClose(world, view.id());
                });
                NativeEffects.boostWindow(world, actor, { atk: stages, def: stages, spa: stages, spd: stages, spe: stages }, window, "world_combat:move/silverwind");
                const self = world.observe(actor);
                const at = self === null ? origin : self.position();
                WorldFeedback.emit(world, silverwindScene, 1, at,
                    { moment: "surge", target: String(actor.ref()), stages: stages, scales: scales, scale: scale }, 26);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, self === null ? 1.4 : self.height() + 0.1, 0)),
                    silverwindSurgeText, [stages, Math.round(window / 20)], 30);
                world.sound("minecraft:block.beacon.power_select", at, 18, "{}");
            }
            done(action);
        }
    });
}
