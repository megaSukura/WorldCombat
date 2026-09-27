/**
 * 毒千针 / barbbarrage 的出手方式。
 *
 * 念头的形状：抖身摆出针阵（aim）→ 一轮齐射把无数毒针扇形喷出（loose）→ 针雨各自飞行命中（barb）或在方块上扎住（stick）。
 * 整轮走完后再结算一次中毒：只要至少一针命中，就按概率给**中针最多的那个敌人**留下一份毒（venom），平局取先命中者。
 * 一幕齐射做透：数量、总张角、速度、中毒都由参数公式决定；每根针各带独立 strike，同一针重复回执去重、不同针可各伤一次。
 * 每根针的首碰者按**自身**毒状态算这一针的份额；只有真实扣血才推动、才画针伤，真正施毒成功才报毒。方向可空放，撞墙的针只扎住。
 * 配置 hail（倾泻）改变针数与威力，走 resolve 把更长的收招与冷却算进去。
 */
namespace PokemonSkills {
    const barbbarrageScene = "world_combat:move_barbbarrage";
    const barbbarrageVenomText = "world_combat.move.barbbarrage.text.venom";
    const barbbarrageLooseText = "world_combat.move.barbbarrage.text.loose";

    /** 用稳定 3D 基把瞄准方向在垂直于 up 的平面里摊成一个扇面；纯竖直瞄准也不会坍成重叠针。 */
    function barbbarrageFan(direction: CombatPoint, angle: number): CombatPoint {
        const frame = WorldGeometry.basis(direction);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return frame.forward.scale(cos).minus(frame.right.scale(sin));
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
            const speed = p("barbbarrage", "barbSpeed", action);
            const radius = p("barbbarrage", "barbRadius", action);
            const spread = p("barbbarrage", "spread", action) * Math.PI / 180;
            const range = action.range();
            const origin = action.origin();
            const intensity = Math.max(0.5, Math.min(2, total / 60));
            let remaining = count, hitAny = false;
            const hitsByTarget: { [ref: string]: number } = Object.create(null), hitOrder: string[] = [];
            WorldFeedback.emit(world, barbbarrageScene, 1, origin,
                { moment: "loose", count: count, scale: radius / 0.16, intensity: intensity }, 22);
            WorldFeedback.text(world, origin, barbbarrageLooseText, [count], 24);
            sound(action, "minecraft:entity.arrow.shoot");
            function launch(index: number): void {
                const t = count === 1 ? 0 : index / (count - 1) - 0.5;
                const direction = barbbarrageFan(baseDirection, t * spread);
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
                        if (target !== null && body.valid(target) && !body.friendly(target)) {
                            // 这一针按当刻首碰者自身的毒状态算份额：已毒/剧毒目标这一针翻倍，不吃别人那一针的账。
                            const share = p("barbbarrage", "volley", withTarget(factContext(action), target)) / count;
                            const landed = impact(current, hit, "barbbarrage", share, { damage: damageSpec("barbbarrage", "volley"), knockback: false }, key);
                            if (landed) {
                                hitAny = true;
                                const ref2 = String(target.ref());
                                if (hitOrder.indexOf(ref2) < 0) { hitOrder.push(ref2); hitsByTarget[ref2] = 0; }
                                hitsByTarget[ref2]++;
                                if (body.valid(target)) body.hitDisplace(target, baseDirection.scale(p("barbbarrage", "push", current)));
                                WorldFeedback.emit(body, barbbarrageScene, 1, hit.position(),
                                    { moment: "barb", target: ref2, intensity: intensity, prick: Math.round(6 * intensity) }, 18);
                            }
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
                    // 只有至少一针真伤、目标仍在且毒真的落下，才报毒与画毒；免疫/拒绝不报成功。
                    if (hitAny && victim !== null && body.valid(victim) && body.random() < p("barbbarrage", "poisonChance", current)) {
                        if (CombatStatus.inflict(body, victim, "poison", p("barbbarrage", "venomTicks", current), 0, { secondary: true })) {
                            const wound = body.observe(victim);
                            const at = wound !== null ? wound.position() : origin;
                            WorldFeedback.text(body, at, barbbarrageVenomText, [], 28);
                            WorldFeedback.emit(body, barbbarrageScene, 1, at, { moment: "venom", target: bestRef }, 22);
                        }
                    }
                    barbScenes.finish(current, done);
                });
                if (!settled && ref !== "") barbScenes.show(action, key, origin,
                    { moment: "flight", projectile: ref, tint: 0x9BE86B, scale: radius / 0.16, intensity: intensity });
            }
            for (var index = 0; index < count; index++) launch(index);
        }
    });
}
