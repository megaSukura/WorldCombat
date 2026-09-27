/**
 * 毒尾 / poisontail 的出手方式。
 *
 * 核心念头：低身转身，把尾巴贴地抡过半圈；尾梢的毒囊沿这条低弧线一路抹毒。它是本族唯一的**低位宽弧扫击**——
 *   围上来的人一块儿被扫到，正对的吃满、旁边的吃折扣；越靠尾梢（越远）毒越容易抹上。
 *
 * 两幕：
 *   起（windup，提交前）：低身、尾巴盘到身后，毒在尾梢聚成一串，只播预告（毒聚在施法者真实的背后，不钉在世界 -Z）。
 *   扫（execute → sweep / sting / venom / miss）：把尾巴当作一条贴地的**实心尾段**（轴心在脚底、长度 `reach`）从身后一侧
 *       扫向另一侧；每一刻只结算当前真正扫过的那一小段弧（轴心 + 前后两条外缘端点围成的低三角），命中的非友方各挨一次
 *       `lash`，墙会先把够不到的尾段截短、墙后不伤。只在 `hurt` 真正落地时才计命中、才播毒击；命中按（越远越高的）概率
 *       抹上共享中毒身份，并用受击位移入口把被扫到的人沿背离方向扫开一点。没人被扫到就只留空响。
 *
 * 与同族分开：水流尾是向前推进的弧形水墙、把人推走并浇灭火；龙尾是正面大扇形把人抽飞逐退；铁尾锁定一点重砸。
 *   毒尾是绕身半圈的低扫，凭尾梢的毒在扫过的人身上留下持续伤害。
 *
 * 选取 kind: "aim"：可点敌人，也可只朝一个方向空扫；选中实体吃满，空扫时最贴近瞄准方向的那个吃满，其余吃折扣。
 *   判定只用贴地低弧（脚底高度带），高飞在空中的目标在尾段之上、不受尾扫。
 *
 * 配置 venom（毒尾式）由 resolve 改时序、由公式改威力/中毒/弧面，提交后才触碰世界。
 */
namespace PokemonSkills {
    const poisontailScene = "world_combat:move_poisontail";
    const poisontailHitText = "world_combat.move.poisontail.text.hit";
    const poisontailVenomText = "world_combat.move.poisontail.text.venom";
    const poisontailMissText = "world_combat.move.poisontail.text.miss";

    define({
        id: "poisontail",
        cooldownParameter: "recharge",
        name: "Poison Tail",
        description: "低身转身，把尾巴贴地抡过半圈：一条贴着地面的尾段从身后扫出，扫到的每个对手各挨一记扫击，正对的吃满、旁边的吃折扣；墙会先把够不到的尾段截短，墙后不伤。尾梢按（越远越高的）概率抹毒并把被扫到的人扫开一点。可以点敌人，也可以朝一个方向空扫；高飞在空中的目标在尾段之上、扫不到。毒尾式更毒但扫得更轻；扫尾式更宽更重但毒难抹上。",
        uses: ["低位横扫一圈、把围上来的敌人一起扫到", "给靠近的多个目标抹毒", "被贴身围攻时把身位扫开一点"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.2,
        prepare: 7,
        active: 1,
        recover: 6,
        cooldown: 16,
        style: "venom",
        defaults: { venom: false, ai: { maxChase: 8, minFoes: 1, seekUnpoisoned: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("poisontail", "reach", pokemon) : 2.6, geometry: "cone", style: "venom",
                color: 0x9BE86B, label: config && config.venom === true ? "毒尾·毒尾式" : "毒尾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["poisontail"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("poisontail", "tempo", context)),
                recover: Math.round(p("poisontail", "settle", context)),
                cooldown: Math.round(p("poisontail", "recharge", context)),
                active: 1,
                range: p("poisontail", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const drops = Math.max(6, Math.round(p("poisontail", "drops", action)));
            const heading = WorldGeometry.flatUnit(aim(action));
            const back = WorldCombat.point(-heading.x(), 0, -heading.z());
            action.present("poisontail:coil", poisontailScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, drops: drops, venom: config && config.venom ? 1 : 0,
                    direction: [back.x(), back.y(), back.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(poisontailScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const selfRef = String(actor.ref());
            const heading = WorldGeometry.flatUnit(aim(action));
            const reach = Math.max(2.0, action.range());
            const arc = p("poisontail", "arc", action);
            const power = p("poisontail", "lash", action);
            const share = p("poisontail", "share", action);
            const chance = p("poisontail", "poisonChance", action);
            const venomTicks = Math.max(60, Math.round(p("poisontail", "venomTicks", action)));
            const push = p("poisontail", "push", action);
            const drops = Math.max(6, Math.round(p("poisontail", "drops", action)));
            const scale = Math.max(0.6, Math.min(1.8, reach / 2.6));
            const intensity = Math.max(0.6, Math.min(2.0, power / 55));
            const feetY = centre.y() - (body === null ? 0.7 : body.height() / 2);
            const pivot = WorldCombat.point(centre.x(), feetY + 0.25, centre.z());
            const low = pivot.y();
            const minY = feetY - 0.15, maxY = feetY + 0.75;
            const base = Math.atan2(heading.z(), heading.x());
            const half = arc * Math.PI / 360;
            // 先按贴地低扇收集一次：确定正对目标，并剔掉墙后的敌人；随后逐刻扫过时不重复判定墙。
            const found: { victim: CombatActor; facts: CombatObservation; contact: CombatPoint }[] = [];
            WorldGeometry.selectBodies(world, WorldGeometry.bodySector(pivot, heading, reach, arc, { below: 0.35, above: 0.55 }),
                function (victim: CombatActor, facts: CombatObservation) {
                    if (String(victim.ref()) === selfRef || world.friendly(victim)) return;
                    const contact = world.closestPoint(victim, pivot);
                    const flatContact = WorldCombat.point(contact.x(), low, contact.z());
                    if (WorldGeometry.blockHit(world, pivot, flatContact) !== null) return;
                    found.push({ victim: victim, facts: facts, contact: contact });
                });
            let primary = action.target() !== null ? String(action.target()!.ref()) : "";
            if (primary !== "" && !found.some(function (entry) { return String(entry.victim.ref()) === primary; })) primary = "";
            if (primary === "" && found.length > 0) {
                let best = -2, bestRef = "";
                for (let index = 0; index < found.length; index++) {
                    const offset = WorldCombat.point(found[index].contact.x() - pivot.x(), 0, found[index].contact.z() - pivot.z());
                    if (offset.length() < 1e-6) { bestRef = String(found[index].victim.ref()); break; }
                    const toward = offset.unit(), cos = toward.x() * heading.x() + toward.z() * heading.z();
                    if (cos > best) { best = cos; bestRef = String(found[index].victim.ref()); }
                }
                primary = bestRef;
            }
            const hitRefs: { [ref: string]: boolean } = {};
            const steps = Math.max(4, Math.min(9, Math.round(arc / 35)));
            let hits = 0, settled = false;

            sound(action, "minecraft:entity.player.attack.sweep");

            function tipAt(angle: number): CombatPoint {
                return WorldCombat.point(pivot.x() + Math.cos(angle) * reach, low, pivot.z() + Math.sin(angle) * reach);
            }
            // 墙截断：够不到的外缘端点落在第一处阻挡上，判定与画面共用这组被截短的端点。
            function clampTip(tip: CombatPoint): CombatPoint {
                const wall = WorldGeometry.blockHit(world, pivot, tip);
                return wall === null ? tip : WorldCombat.point(wall.position().x(), low, wall.position().z());
            }

            /** 当前一刻：只结算刚扫过的那一小段低弧，命中的目标各一次。 */
            function advance(current: CombatAction, index: number): void {
                if (settled) return;
                const scope = current.world();
                const a0 = base - half + 2 * half * index / steps;
                const a1 = base - half + 2 * half * (index + 1) / steps;
                const tipPrev = clampTip(tipAt(a0)), tipCur = clampTip(tipAt(a1));
                const slice: number[][] = [[pivot.x(), pivot.y(), pivot.z()],
                    [tipPrev.x(), tipPrev.y(), tipPrev.z()], [tipCur.x(), tipCur.y(), tipCur.z()]];
                if (tipPrev.minus(tipCur).length() > 1e-4) {
                    const region = WorldGeometry.bodyPolygon([pivot, tipPrev, tipCur], minY, maxY);
                    for (let i = 0; i < found.length; i++) {
                        const entry = found[i], ref = String(entry.victim.ref());
                        if (hitRefs[ref] || !scope.valid(entry.victim)) continue;
                        if (!region.intersects(entry.facts.boundsMin(), entry.facts.boundsMax())) continue;
                        hitRefs[ref] = true;
                        const landed = hurt(current, entry.victim, "poisontail", power * (ref === primary ? 1 : share),
                            { damage: damageSpec("poisontail", "lash"), contact: true });
                        if (!landed) continue;
                        hits++;
                        const at = entry.contact;
                        const distance = at.minus(pivot).length();
                        const ratio = reach <= 0 ? 0 : Math.min(1, distance / reach);
                        const tipChance = Math.max(0.04, Math.min(0.7, chance * (0.7 + 0.6 * ratio)));
                        const strike = power * (ref === primary ? 1 : share);
                        WorldFeedback.emit(scope, poisontailScene, 1, at, { moment: "sting", target: ref, drops: drops,
                            scale: scale, intensity: Math.max(0.5, Math.min(2.0, strike / 55)) }, 20);
                        scope.sound("cobblemon:impact.poison", at, 14, "{}");
                        if (scope.valid(entry.victim) && world.random() < tipChance
                            && CombatStatus.inflict(scope, entry.victim, "poison", venomTicks, 0, { secondary: true })) {
                            const now = scope.observe(entry.victim);
                            const venomAt = now === null ? at : now.position();
                            WorldFeedback.emit(scope, poisontailScene, 1, venomAt,
                                { moment: "venom", target: ref, drops: drops, scale: scale }, 22);
                            WorldFeedback.text(scope, venomAt.plus(WorldCombat.point(0, 1.0, 0)), poisontailVenomText, [], 22);
                        } else {
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), poisontailHitText, [], 20);
                        }
                        const away = WorldCombat.point(at.x() - pivot.x(), 0, at.z() - pivot.z());
                        if (away.length() >= 0.05 && scope.valid(entry.victim))
                            scope.hitDisplace(entry.victim, away.unit().scale(push));
                    }
                }
                scenes.show(current, "sweep", centre, { moment: "sweep", path: slice, arc: arc, reach: reach,
                    drops: drops, scale: scale, intensity: intensity, hits: hits, step: index + 1 });
                if (index + 1 < steps) { current.after(1, function (next: CombatAction) { advance(next, index + 1); }); return; }
                finish(current);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (hits === 0) {
                    const scope = current.world();
                    WorldFeedback.emit(scope, poisontailScene, 1, centre, { moment: "miss", reach: reach, scale: scale }, 16);
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.0, 0)), poisontailMissText, [], 20);
                    scope.sound("cobblemon:move.gust.actor", centre, 14, "{}");
                }
                scenes.finish(current, done);
            }

            advance(action, 0);
        }
    });
}
