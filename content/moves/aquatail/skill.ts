/**
 * 水流尾 / aquatail 的出手方式。
 *
 * 核心念头：转身把尾巴抡出去，尾梢甩起的这一道水往前压成弧形浪。浪头从贴身一圈圈推进到射程外，推进到的敌人
 *   被拍中、沿背离方向推开，并湿身片刻；身上的火与灼伤被这道水浇熄。浪是推进的，所以走出扇面、或退到浪头之外，
 *   就能躲开——原生的 90 命中在这里是位置判定。发浪当刻的方向与中心就定死，之后转身不回带已经发出去的浪。
 *
 * 两幕：
 *   起（lash，提交前）：尾巴甩起、水光在尾梢聚起，只播预告。
 *   推浪（crest × steps → hit / drench / miss）：提交后按 `steps` 一拍一拍把浪头沿**发出当刻锁定**的方向往外推；每一拍
 *       判定落在本拍环带里、且从浪根通视的敌人：结算一次 wave（越远越淡）、把人沿背离方向推开、挂上湿身（共享身份
 *       soaked）；被拍中的火与灼伤被浇熄并腾起水汽。同一拍里尾梢的短扫点扫到哪，哪一段窄浪前就由它带出来；
 *       墙挡住的人拍不到，全部推完才收势。
 *
 * 与同族分开：铁尾锁定一点、钢铁重砸；水流尾是一片向前压的弧形水墙，判定随浪头推进，把人推走而不是砸凹。
 */
namespace PokemonSkills {
    /** 弧形浪的有序顶点：外弧正序 + 内弧倒序，围成一条环带，既是判定形状也是画面填充。 */
    function aquatailBand(origin: CombatPoint, direction: CombatPoint, inner: number, outer: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(5, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [];
        for (let i = 0; i <= samples; i++) {
            const angle = base - half + 2 * half * i / samples;
            points.push([origin.x() + Math.sin(angle) * outer, origin.y() + 0.06, origin.z() + Math.cos(angle) * outer]);
        }
        const innerRadius = Math.max(0, inner);
        for (let j = samples; j >= 0; j--) {
            const angle = base - half + 2 * half * j / samples;
            points.push([origin.x() + Math.sin(angle) * innerRadius, origin.y() + 0.06, origin.z() + Math.cos(angle) * innerRadius]);
        }
        return points;
    }

    /** 目标身上是否真的在烧（原版着火，与共享身份 burn 分开读）。 */
    function aquatailOnFire(world: CombatWorld, victim: CombatActor): boolean {
        const entity = world.nativeEntity(victim);
        return entity !== null && typeof entity.isOnFire === "function" && !!entity.isOnFire();
    }

    define({
        id: aquatailId,
        cooldownParameter: "recharge",
        name: "Aqua Tail",
        description: "借转身把尾巴抡成一道向前压的弧形水墙：发出当刻的方向与中心就定死，浪头从贴身一圈圈推到射程外，拍中的敌人各挨一记接触伤害、被沿背离方向推开，并湿身片刻（移动速度降低 10%）；身上着火或被灼伤的目标都会被这一浪浇熄，带灼伤的目标还会解除灼伤。浪是推进的，走出弧面、退到浪头之外，或被墙挡住都能躲开；不选敌人也能朝地面空放。",
        uses: ["用一片向前压的弧形水墙拍开身前的人", "把贴身的敌人连同身位一起推走", "一浪浇熄对手身上的火与灼伤"],
        kind: "aim",
        range: 3.6,
        maxRange: 5.4,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 40,
        style: "surge",
        defaults: { heavy: false, ai: { maxChase: 9, pointBlank: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(aquatailId, "reach", pokemon) : 3.6, geometry: "cone", style: "surge", color: 0x4FC3E8, label: "水流尾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aquatailId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aquatailId, "tempo", context)),
                recover: Math.round(p(aquatailId, "aftercast", context)),
                cooldown: Math.round(p(aquatailId, "recharge", context)),
                active: 0,
                range: p(aquatailId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_aquatail:lash", aquatailScene, 1, action.origin(),
                JSON.stringify({ moment: "lash", windup: prepare, heavy: config && config.heavy ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            // 发出当刻定死中心与方向：之后本体再转身或受推，已经甩出去的浪都不会跟着换向。
            const centre = body === null ? action.origin() : body.position();
            const direction = aim(action);
            const base = Math.atan2(direction.x(), direction.z());
            const halfAngle = Math.min(180, Math.max(5, p(aquatailId, "arc", action))) * Math.PI / 360;
            const bodyWidth = body === null ? 0.9 : body.width();
            const power = p(aquatailId, "wave", action);
            const arc = p(aquatailId, "arc", action);
            const reach = Math.max(2.5, action.range());
            const falloff = Math.max(0.3, Math.min(0.9, p(aquatailId, "falloff", action)));
            const push = p(aquatailId, "push", action);
            const steps = Math.max(2, Math.round(p(aquatailId, "steps", action)));
            const soak = Math.max(60, Math.round(p(aquatailId, "soakTicks", action)));
            const splash = Math.max(8, Math.round(p(aquatailId, "splash", action)));
            const scale = Math.max(0.6, Math.min(2.2, reach / 3.6));
            const intensity = Math.max(0.6, Math.min(2.2, power / 95));
            const tipRadius = Math.max(0.7, Math.min(reach - 0.2, bodyWidth * 1.6));
            const scenes = WorldFeedback.actionScenes(aquatailScene, 1);
            const selfRef = String(actor.ref());
            const caught: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (hits === 0) {
                    const scope = current.world(), here = scope.observe(actor);
                    const at = here === null ? centre : here.position();
                    WorldFeedback.emit(scope, aquatailScene, 1, at, { moment: "miss", scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), aquatailMissText, [], 24);
                }
                scenes.stop(current);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = reach * (step + 1) / steps;
                const inner = Math.max(0, reach * step / steps - 0.35);
                const progress = steps <= 1 ? 1 : step / (steps - 1);
                const tipAngle = base - halfAngle + 2 * halfAngle * progress;
                const previous = steps <= 1 ? progress : Math.max(0, (step - 1) / (steps - 1));
                const fromAngle = base - halfAngle + 2 * halfAngle * previous;
                const tip = WorldCombat.point(centre.x() + Math.sin(tipAngle) * tipRadius, centre.y() + 0.55,
                    centre.z() + Math.cos(tipAngle) * tipRadius);
                const tailPath = [
                    [centre.x() + Math.sin(fromAngle) * tipRadius, centre.y() + 0.55, centre.z() + Math.cos(fromAngle) * tipRadius],
                    [tip.x(), tip.y(), tip.z()]
                ];
                // 同一 key 每拍更新：命中带随浪头外推，不另起一条 14 刻旧带；尾梢短扫点由真实的当前端点带出窄浪前。
                scenes.show(current, "crest", centre,
                    { moment: "crest", path: aquatailBand(centre, direction, inner, outer, arc, 12),
                        direction: [direction.x(), direction.y(), direction.z()], outer: outer, inner: inner,
                        arc: arc, splash: splash, scale: scale, intensity: intensity, step: step + 1, steps: steps });
                scenes.show(current, "tail", tip,
                    { moment: "tail", path: tailPath, direction: [direction.x(), direction.y(), direction.z()],
                        tip: [tip.x(), tip.y(), tip.z()], outer: outer, inner: inner, arc: arc, splash: splash,
                        scale: scale, intensity: intensity, step: step + 1, steps: steps });
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(centre, direction, outer, arc, { below: 1.8, above: 2.6 }), function (victim, facts) {
                    if (String(victim.ref()) === selfRef) return;
                    const ref = String(victim.ref());
                    if (caught[ref]) return;
                    const point = facts.position(), distance = point.minus(centre).length();
                    if (distance < inner || distance > outer + 0.25) return;
                    // 遮挡检查与画面里的浪头读同一起点与朝向：墙截住的这一段拍不到后面的人。
                    if (!scope.clear(centre, point)) return;
                    caught[ref] = true;
                    const ratio = reach <= 0 ? 0 : Math.min(1, distance / reach);
                    const strength = 1 - (1 - falloff) * ratio;
                    if (!hurt(current, victim, aquatailId, power * strength, { damage: damageSpec(aquatailId, "wave"), contact: true })) return;
                    hits++;
                    if (scope.valid(victim)) {
                        const away = WorldCombat.point(point.x() - centre.x(), 0, point.z() - centre.z());
                        if (away.length() >= 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                    }
                    const at = scope.observe(victim);
                    const atPoint = at === null ? point : at.position();
                    WorldFeedback.emit(scope, aquatailScene, 1, atPoint,
                        { moment: "hit", target: ref, splash: splash, scale: scale,
                            intensity: Math.max(0.5, Math.min(2.2, (power * strength) / 95)) }, 22);
                    scope.sound("cobblemon:impact.water", atPoint, 14, "{}");
                    // 伤害落定后再上湿身：拍不实（被原生拒绝）时不会去动任何已有的湿身实例。
                    const soaked = CombatStatus.apply(scope, victim, "soaked", aquatailEffect, soak, 0);
                    // 原版着火与共享身份 burn 分开处理：只带其中一个也会被这一浪浇熄。
                    const burning = CombatStatus.has(scope, victim, "burn");
                    const onFire = scope.valid(victim) && aquatailOnFire(scope, victim);
                    if (burning) CombatStatus.cure(scope, victim, "burn");
                    if (onFire && scope.valid(victim)) scope.ignite(victim, 0);
                    if (burning || onFire) {
                        WorldFeedback.emit(scope, aquatailScene, 1, atPoint, { moment: "douse", target: ref, scale: scale }, 26);
                        WorldFeedback.text(scope, atPoint.plus(WorldCombat.point(0, 1.1, 0)), aquatailDouseText, [], 26);
                        scope.sound("minecraft:block.fire.extinguish", atPoint, 14, "{}");
                    } else if (soaked) {
                        WorldFeedback.text(scope, atPoint.plus(WorldCombat.point(0, 1.1, 0)), aquatailDrenchText, [], 22);
                    }
                });
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, advance);
            }

            sound(action, "minecraft:item.trident.riptide_1");
            advance(action);
        }
    });
}
