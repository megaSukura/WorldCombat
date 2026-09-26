/**
 * 群魔乱舞 / infernalparade 的出手方式。
 *
 * 念头的形状：脚下腾起一圈鬼火（coven）→ 鬼火先散开冲出一段（flight，本体是原生投射物，客户端轮廓绑它的 ref）→ 各自转向追向目标（strike / fade）。
 * 这是本族里唯一会“追”的一招：起旋延迟内直线走，之后每刻朝**瞄中的敌方实体**转向；空瞄（方向或世界点）时保持起始方向，不吸附未选目标，
 * 目标消失也沿最后方向飞到原寿命。整队走完后再结算一次灼伤：只要至少一团命中，就按概率点燃目标（ignite）。
 * 一幕做透：数量、张角、转向、速度、灼伤都由参数公式决定；目标带任意异常时整队翻倍。
 * 配置 dirge（挽歌）改变团数、速度与转向，走 resolve 把更长的收招与冷却算进去。
 */
namespace PokemonSkills {
    const infernalparadeScene = "world_combat:move_infernalparade";
    const infernalparadeBurnText = "world_combat.move.infernalparade.text.burn";
    const infernalparadeSummonText = "world_combat.move.infernalparade.text.summon";

    /** 把瞄准方向绕 Y 轴旋转 angle 弧度；让鬼火先散成一支队伍。 */
    function infernalparadeWhirl(direction: CombatPoint, angle: number): CombatPoint {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "infernalparade",
        name: "Infernal Parade",
        description: "召出一队幽幽燃烧的鬼火，先散开再各自扭头追向目标扑上去。整队威力按团数均分；只要有一团命中，就有机会让目标灼伤。目标带着任意异常时整队翻倍。",
        uses: ["追踪的鬼火群", "对带异常者补刀", "把火点上再交给队友"],
        kind: "aim",
        range: 13,
        prepare: 6,
        active: 48,
        recover: 8,
        cooldown: 38,
        style: "ghostfire",
        defaults: { dirge: false, ai: { maxChase: 13, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["infernalparade"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var dirge = !!(config && config.dirge);
            return {
                prepare: p("infernalparade", "prepare", context),
                recover: p("infernalparade", "recover", context) + (dirge ? 2 : 0),
                cooldown: p("infernalparade", "cooldown", context) + (dirge ? 5 : 0)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_infernalparade:coven", infernalparadeScene, 1, action.origin(), JSON.stringify({ moment: "coven" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const paradeScenes = WorldFeedback.actionScenes(infernalparadeScene);
            const baseDirection = aim(action);
            const count = Math.max(1, Math.round(p("infernalparade", "wisps", action)));
            const total = p("infernalparade", "parade", action);
            const share = total / count;
            const speed = p("infernalparade", "wispSpeed", action);
            const radius = p("infernalparade", "wispRadius", action);
            const turn = p("infernalparade", "turn", action);
            const delay = Math.max(1, Math.round(p("infernalparade", "orbitDelay", action)));
            const spread = p("infernalparade", "spread", action) * Math.PI / 180;
            const range = action.range();
            const org = action.origin();
            const aimed = action.target();
            const homingRef = aimed !== null && world.valid(aimed) && !world.friendly(aimed) ? String(aimed.ref()) : "";
            const homing = homingRef === "" ? undefined : { target: homingRef, turn: turn, delay: delay, range: 28 };
            let remaining = count, hitAny = false;
            let burnTarget: any = null;
            WorldFeedback.emit(world, infernalparadeScene, 1, org,
                { moment: "summon", count: count, scale: radius / 0.24, intensity: Math.max(0.5, Math.min(2, total / 60)) }, 24);
            WorldFeedback.text(world, org, infernalparadeSummonText, [count], 24);
            sound(action, "minecraft:entity.vex.charge");
            function launch(index: number): void {
                const t = count === 1 ? 0 : index / (count - 1) - 0.5;
                const direction = infernalparadeWhirl(baseDirection, t * spread);
                const key = "wisp:" + index;
                let ref = "", settled = false;
                ref = LivingActions.projectile(action, {
                    speed: speed, range: range, radius: radius, direction: direction,
                    appearance: { sprite: "cobblemon:particle/generic/fire/wisp", tint: 0x8FB3FF, glow: true, homing: homing },
                    impact: function (current, hit) {
                        settled = true;
                        paradeScenes.stop(current, key);
                        const body = current.world();
                        const who = hit.target();
                        if (who !== null && body.valid(who)) {
                            const force = Math.max(0.5, Math.min(2.2, total / 60));
                            const landed = impact(current, hit, "infernalparade", share, { damage: damageSpec("infernalparade", "parade"), knockback: false });
                            if (landed) { hitAny = true; burnTarget = who; }
                            WorldFeedback.emit(body, infernalparadeScene, 1, hit.position(),
                                { moment: "strike", target: String(who.ref()), intensity: force, strikeCount: Math.round(30 * force) }, 22);
                            sound(current, "cobblemon:impact.ghost");
                        } else {
                            WorldFeedback.emit(body, infernalparadeScene, 1, hit.position(), { moment: "fade" }, 16);
                        }
                    }
                }, function (current) {
                    settled = true;
                    paradeScenes.stop(current, key);
                    remaining--;
                    if (remaining > 0) return;
                    const body = current.world();
                    if (hitAny && burnTarget !== null && body.valid(burnTarget) && body.random() < p("infernalparade", "burnChance", current)) {
                        CombatStatus.inflict(body, burnTarget, "burn", p("infernalparade", "burnTicks", current), 0, { secondary: true });
                        const wound = body.observe(burnTarget);
                        if (wound !== null) WorldFeedback.text(body, wound.position(), infernalparadeBurnText, [], 28);
                        WorldFeedback.emit(body, infernalparadeScene, 1, wound !== null ? wound.position() : org, { moment: "ignite" }, 24);
                    }
                    paradeScenes.finish(current, done);
                });
                if (!settled && ref !== "") paradeScenes.show(action, key, org,
                    { moment: "flight", projectile: ref, tint: 0x8FB3FF, scale: radius / 0.24, intensity: Math.max(0.5, Math.min(2, total / 60)) });
            }
            for (var index = 0; index < count; index++) launch(index);
        }
    });
}
