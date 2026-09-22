/**
 * 毒尾 / poisontail 的出手方式。
 *
 * 核心念头：低身转身，把尾巴贴地抡过半圈；尾梢的毒囊沿这条低弧线一路抹毒。它是本族唯一的**低位宽弧扫击**——
 *   围上来的人一块儿被扫到，正对的吃满、旁边的吃折扣；越靠尾梢（越远）毒越容易抹上。
 *
 * 两幕：
 *   起（windup，提交前）：低身、尾巴盘到身后，毒在尾梢聚成一串，只播预告。
 *   扫（execute → sweep / sting / venom / miss）：提交后尾巴从身后扫到身前再扫向另一侧，
 *       扫过一个 `arc` 度、`reach` 半径的低弧面；弧面内每个非友方各结算一次 `lash` 接触伤害，
 *       按（越远越高的）概率抹上共享中毒身份并把被扫到的人沿背离方向扫开一点。没人被扫到就只留空响。
 *
 * 与同族分开：水流尾是向前推进的弧形水墙、把人推走并浇灭火；龙尾是正面大扇形把人抽飞逐退；铁尾锁定一点重砸。
 *   毒尾是绕身半圈的低扫，凭尾梢的毒在扫过的人身上留下持续伤害。
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
        name: "Poison Tail",
        description: "The user swings its tail low in a wide arc, sweeping everyone close and smearing poison from the venomous tip.",
        uses: ["低位横扫一圈、把围上来的敌人一起扫到", "给靠近的多个目标抹毒", "被贴身围攻时把身位扫开一点"],
        kind: "enemy",
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
            action.present("poisontail:coil", poisontailScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, drops: drops, venom: config && config.venom ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const heading = aim(action);
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
            const primary = action.target() !== null ? String(action.target()!.ref()) : "";
            const groundY = body !== null ? centre.y() - body.height() / 2 : centre.y() - 0.7;
            const half = arc * Math.PI / 360, base = Math.atan2(heading.z(), heading.x()), steps = 11;
            const path: number[][] = [[centre.x(), groundY, centre.z()]];
            for (let index = 0; index <= steps; index++) {
                const angle = base - half + 2 * half * index / steps;
                path.push([centre.x() + Math.cos(angle) * reach, groundY, centre.z() + Math.sin(angle) * reach]);
            }
            let hits = 0;

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(centre, heading, reach, arc, { below: 1.2, above: 1.6 }), function (victim: CombatActor, facts: CombatObservation) {
                if (String(victim.ref()) === String(actor.ref())) return;
                const ref = String(victim.ref()), point = facts.position();
                const distance = point.minus(centre).length();
                const ratio = reach <= 0 ? 0 : Math.min(1, distance / reach);
                const tipChance = Math.max(0.04, Math.min(0.7, chance * (0.7 + 0.6 * ratio)));
                const landed = hurt(action, victim, "poisontail", power * (ref === primary ? 1 : share),
                    { damage: damageSpec("poisontail", "lash"), contact: true });
                WorldFeedback.emit(world, poisontailScene, 1, point,
                    { moment: "sting", target: ref, drops: drops, scale: scale,
                        intensity: Math.max(0.5, Math.min(2.0, power * (ref === primary ? 1 : share) / 55)) }, 20);
                hits++;
                if (!landed || !world.valid(victim)) return;
                world.sound("cobblemon:impact.poison", point, 14, "{}");
                if (world.random() < tipChance && CombatStatus.inflict(world, victim, "poison", venomTicks, 0, { secondary: true })) {
                    const now = world.observe(victim);
                    const at = now === null ? point : now.position();
                    WorldFeedback.emit(world, poisontailScene, 1, at, { moment: "venom", target: ref, drops: drops, scale: scale }, 22);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), poisontailVenomText, [], 22);
                } else {
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), poisontailHitText, [], 20);
                }
                const away = WorldCombat.point(point.x() - centre.x(), 0, point.z() - centre.z());
                if (away.length() >= 0.05) world.displace(victim, away.unit().scale(push));
            });
            WorldFeedback.emit(world, poisontailScene, 1, centre,
                { moment: "sweep", path: path, arc: arc, reach: reach, drops: drops, scale: scale, intensity: intensity, hits: hits }, 22);
            if (hits === 0) {
                WorldFeedback.emit(world, poisontailScene, 1, centre, { moment: "miss", reach: reach, scale: scale }, 16);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.0, 0)), poisontailMissText, [], 20);
                sound(action, "cobblemon:move.gust.actor");
            }
            done(action);
        }
    });
}
