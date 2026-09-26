/**
 * 毒千针 / barbbarrage 的出手方式。
 *
 * 念头的形状：抖身摆出针阵（aim）→ 一轮齐射把无数毒针扇形喷出（loose）→ 针雨各自飞行命中（barb）或在方块上扎住（stick）。
 * 整轮走完后再结算一次中毒：只要至少一针命中，就按概率给**中针最多的那个敌人**留下一份毒（venom），平局取先命中者。
 * 一幕齐射做透：数量、张角、速度、中毒都由参数公式决定；目标已中毒时整轮翻倍。方向可空放，撞墙的针只扎住无后续伤害。
 * 配置 hail（倾泻）改变针数与威力，走 resolve 把更长的收招与冷却算进去。
 */
namespace PokemonSkills {
    const barbbarrageScene = "world_combat:move_barbbarrage";
    const barbbarrageVenomText = "world_combat.move.barbbarrage.text.venom";
    const barbbarrageLooseText = "world_combat.move.barbbarrage.text.loose";

    /** 把瞄准方向绕 Y 轴旋转 angle 弧度；用于把针雨摊成一个扇面。 */
    function barbbarrageRotate(direction: CombatPoint, angle: number): CombatPoint {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "barbbarrage",
        name: "Barb Barrage",
        description: "抖身抖出无数毒针，摊成一面扇形齐射出去。针数随等级与速度增长，整轮威力按针数均分；只要有一针命中，就有机会让目标中毒。目标已经中毒时整轮翻倍。",
        uses: ["扇形压制的物理远程", "用一面扇形压制一群敌人，有机会给其中一个挂毒", "追击中毒的敌人"],
        kind: "aim",
        range: 12,
        prepare: 5,
        active: 36,
        recover: 8,
        cooldown: 34,
        style: "barb",
        defaults: { hail: false, ai: { maxChase: 12, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["barbbarrage"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var hail = !!(config && config.hail);
            return {
                prepare: p("barbbarrage", "prepare", context),
                recover: p("barbbarrage", "recover", context) + (hail ? 2 : 0),
                cooldown: p("barbbarrage", "cooldown", context) + (hail ? 3 : 0)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_barbbarrage:aim", barbbarrageScene, 1, action.origin(), JSON.stringify({ moment: "aim" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const barbScenes = WorldFeedback.actionScenes(barbbarrageScene);
            const baseDirection = aim(action);
            const count = Math.max(1, Math.round(p("barbbarrage", "barbs", action)));
            const total = p("barbbarrage", "volley", action);
            const share = total / count;
            const speed = p("barbbarrage", "barbSpeed", action);
            const radius = p("barbbarrage", "barbRadius", action);
            const spread = p("barbbarrage", "spread", action) * Math.PI / 180;
            const range = action.range();
            const origin = action.origin();
            let remaining = count, hitAny = false;
            const hitsByTarget: { [ref: string]: number } = Object.create(null), hitOrder: string[] = [];
            WorldFeedback.emit(world, barbbarrageScene, 1, origin,
                { moment: "loose", count: count, scale: radius / 0.16, intensity: Math.max(0.5, Math.min(2, total / 60)) }, 22);
            WorldFeedback.text(world, origin, barbbarrageLooseText, [count], 24);
            sound(action, "minecraft:entity.arrow.shoot");
            function launch(index: number): void {
                const t = count === 1 ? 0 : index / (count - 1) - 0.5;
                const direction = barbbarrageRotate(baseDirection, t * spread);
                const key = "barb:" + index;
                let ref = "", settled = false;
                ref = LivingActions.projectile(action, {
                    speed: speed, range: range, radius: radius, direction: direction,
                    appearance: { sprite: "cobblemon:particle/generic/spike", tint: 0x9BE86B, glow: true },
                    impact: function (current, hit) {
                        settled = true;
                        barbScenes.stop(current, key);
                        const body = current.world();
                        const target = hit.target();
                        if (target !== null && body.valid(target)) {
                            const force = Math.max(0.5, Math.min(2, total / 60));
                            const landed = impact(current, hit, "barbbarrage", share, { damage: damageSpec("barbbarrage", "volley"), knockback: false });
                            if (landed) {
                                hitAny = true;
                                const ref2 = String(target.ref());
                                if (hitOrder.indexOf(ref2) < 0) { hitOrder.push(ref2); hitsByTarget[ref2] = 0; }
                                hitsByTarget[ref2]++;
                            }
                            if (body.valid(target)) body.hitDisplace(target, baseDirection.scale(p("barbbarrage", "push", current)));
                            WorldFeedback.emit(body, barbbarrageScene, 1, hit.position(),
                                { moment: "barb", target: String(target.ref()), intensity: force, prick: Math.round(6 * force) }, 18);
                        } else {
                            WorldFeedback.emit(body, barbbarrageScene, 1, hit.position(), { moment: "stick" }, 16);
                        }
                    }
                }, function (current) {
                    settled = true;
                    barbScenes.stop(current, key);
                    remaining--;
                    if (remaining > 0) return;
                    const body = current.world();
                    let bestRef = "", bestCount = 0;
                    for (var i = 0; i < hitOrder.length; i++) if (hitsByTarget[hitOrder[i]] > bestCount) { bestCount = hitsByTarget[hitOrder[i]]; bestRef = hitOrder[i]; }
                    const victim = bestRef === "" ? null : body.actor(bestRef);
                    if (hitAny && victim !== null && body.valid(victim) && body.random() < p("barbbarrage", "poisonChance", current)) {
                        CombatStatus.inflict(body, victim, "poison", p("barbbarrage", "venomTicks", current), 0, { secondary: true });
                        const wound = body.observe(victim);
                        if (wound !== null) WorldFeedback.text(body, wound.position(), barbbarrageVenomText, [], 28);
                        WorldFeedback.emit(body, barbbarrageScene, 1, wound !== null ? wound.position() : origin, { moment: "venom" }, 22);
                    }
                    barbScenes.finish(current, done);
                });
                if (!settled && ref !== "") barbScenes.show(action, key, origin,
                    { moment: "flight", projectile: ref, tint: 0x9BE86B, scale: radius / 0.16, intensity: Math.max(0.5, Math.min(2, total / 60)) });
            }
            for (var index = 0; index < count; index++) launch(index);
        }
    });
}
