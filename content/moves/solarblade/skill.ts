/**
 * 日光刃 / solarblade —— 出手方式。
 *
 * 核心念头：把日光在身侧凝成一把整刃，向前踏出一步挥刃斩过去；晴天里刀已经在手，阴雨里要站着凝刃、刀也钝一半。
 *
 * 两幕（强日光下只有第二幕）：
 *   起（gather，提交前）：整刃在身体局部侧方由真实朝向凝出、亮到真实准备结束；只播预告，可被打断（打断不花 PP）。
 *       客户端的自定义场景按身体锚点与真实 forward/right/up 画这把整刃，转身不落在固定世界轴上。
 *   击（dash → slash → hit / fizzle）：提交后朝瞄准方向逐刻踏出 `dash` 格，身体每走一步由引擎沿真实历史补拖尾，
 *       被墙挡住实际走不满就收脚；再从真实落点挥斩——横扫用实际刃段在扇内扫过（判定为真实实体箱的扇形弧），
 *       突刺沿正前方一条短直线刺出（判定为同一条细线）；命中各挨一记接触伤害并沿刀势推开，打空只留一下挥空的光屑。
 *
 * 与同族分开：日光束是远距离一条贯穿的光带、流星光束要越掩体走弧；日光刃是唯一贴身的那个——
 *   它靠突进贴上去、一刀扫开面前一片，晴天里的价值是「无预警的贴身爆发」。
 */
namespace PokemonSkills {
    const solarbladeScene = "world_combat:move_solarblade";
    const solarbladeBladeScene = "world_combat:move_solarblade/blade";
    const solarbladeSunText = "world_combat.move.solarblade.text.sun";
    const solarbladeHitText = "world_combat.move.solarblade.text.hit";
    const solarbladeSweepText = "world_combat.move.solarblade.text.sweep";
    const solarbladeMissText = "world_combat.move.solarblade.text.miss";

    define({
        freeMovement: true,
        id: "solarblade",
        name: "日光刃",
        description: "站定把日光在身侧凝成一把整刃，然后向前踏出一步挥刃斩击：横扫把扇形内的敌人一起打退，突刺则沿正前方一条短直线刺出；前踏被方块挡住在实际停处收脚挥刃。强日光下当场斩出；阴雨天刀钝一半、凝刃更慢。",
        uses: ["贴身穿插后一刀扫开一排", "晴天里无预警的近身爆发", "把面前的敌人一起推离"],
        kind: "aim",
        range: 3.6,
        maxRange: 6,
        prepare: 20,
        active: 0,
        recover: 11,
        cooldown: 40,
        style: "blade",
        stationary: true,
        defaults: { thrust: false, ai: { maxChase: 16, multiFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const thrust = !!(config && config.thrust);
            return { radius: p("solarblade", "reach", pokemon), geometry: thrust ? "line" : "cone", style: "blade", color: 0xFFE9A0,
                label: thrust ? "日光刃·突刺" : "日光刃·横扫" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["solarblade"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const thrust = !!(config && config.thrust);
            return {
                prepare: Math.round(p("solarblade", "charge", context)),
                recover: Math.round(p("solarblade", "recover", context)) + (thrust ? 1 : 0),
                cooldown: Math.round(p("solarblade", "cooldown", context)) + (thrust ? 2 : 0),
                active: skills["solarblade"].active,
                range: p("solarblade", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 提交前只有只读世界：用 sense() 读真实身体与朝向，把整刃的局部几何交给客户端场景。
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            const origin = action.origin();
            const look = WorldGeometry.facing(world, actor);
            const aimDelta = action.targetPosition().minus(origin);
            const facing = look !== null && look.length() > 1e-6 ? look
                : aimDelta.length() > 0.01 ? aimDelta.unit() : action.direction();
            const frame = WorldGeometry.basis(facing, action.direction(), WorldCombat.point(0, 1, 0));
            const height = body === null ? 1.4 : body.height();
            const span = Math.max(1.0, height * 1.05);
            const blade = Math.max(8, Math.round(p("solarblade", "blade", action)));
            const instant = p("solarblade", "charge", action) <= 0 ? 1 : 0;
            action.present("solarblade:blade", solarbladeBladeScene, 1, origin,
                JSON.stringify({ moment: "gather", forward: [frame.forward.x(), frame.forward.y(), frame.forward.z()],
                    right: [frame.right.x(), frame.right.y(), frame.right.z()], up: [frame.up.x(), frame.up.y(), frame.up.z()],
                    span: span, side: 0.5, blade: blade, windup: prepare, sun: instant,
                    thrust: config && config.thrust ? 1 : 0, start: world.tick() }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const before = world.observe(actor);
            const origin = before === null ? action.origin() : before.position();
            const direction = aim(action);
            const flat = WorldCombat.point(direction.x(), 0, direction.z());
            const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const reach = Math.max(1.6, p("solarblade", "reach", action));
            const arc = Math.max(20, p("solarblade", "arc", action));
            const dash = Math.max(0, p("solarblade", "dash", action));
            const power = p("solarblade", "slash", action);
            const push = p("solarblade", "push", action);
            const blade = Math.max(8, Math.round(p("solarblade", "blade", action)));
            const thrust = !!(config && config.thrust);
            const intensity = Math.max(0.6, Math.min(2.6, power / 130));
            const scale = Math.max(0.6, Math.min(2.0, reach / 3.2));
            const width = before === null ? 0.9 : before.width();
            const selfRef = String(actor.ref());
            const step = Math.max(0.4, dash / 4);
            let travelled = 0, guard = 0;

            function cut(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? origin : body.position();
                sound(current, "cobblemon:move.razorleaf.actor_1");
                // 斩击以真实落点为心；表现与服务端共用同一方向、半径与张角（突刺共用同一条直刺线）。
                current.present("solarblade:blade", solarbladeBladeScene, 1, at,
                    JSON.stringify({ moment: "slash", direction: [direction.x(), direction.y(), direction.z()],
                        reach: reach, arc: arc, blade: blade, scale: scale, intensity: intensity,
                        thrust: thrust ? 1 : 0, start: scope.tick(), duration: 20 }));
                let hits = 0, strike = at.plus(direction.scale(Math.min(reach, 1.2)));
                function land(victim: CombatActor, facts: CombatObservation): void {
                    if (String(victim.ref()) === selfRef || facts.friendly()) return;
                    if (!scope.clear(at, facts.position())) return;
                    if (!hurt(current, victim, "solarblade", power, { damage: damageSpec("solarblade", "slash"), contact: true, slice: true })) return;
                    hits++;
                    strike = facts.position();
                    if (scope.valid(victim)) scope.hitDisplace(victim, direction.scale(push));
                    WorldFeedback.emit(scope, solarbladeScene, 1, facts.position(),
                        { moment: "hit", target: String(victim.ref()), blade: blade, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.6, power / 130)) }, 24);
                }
                if (thrust) {
                    const thickness = Math.max(0.3, Math.min(1.0, width * 0.5));
                    WorldGeometry.selectBodies(scope,
                        WorldGeometry.bodySegment(at, at.plus(direction.scale(reach)), thickness), land);
                } else {
                    WorldGeometry.selectBodies(scope,
                        WorldGeometry.bodySector(at, direction, reach, arc, { below: 1, above: 3 }), land);
                }
                if (hits > 0) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), hits > 1 ? solarbladeSweepText : solarbladeHitText, hits > 1 ? [hits] : [], 28);
                    scope.sound("cobblemon:move.razorleaf.target", at, 16, "{}");
                } else {
                    WorldFeedback.emit(scope, solarbladeScene, 1, strike, { moment: "fizzle", blade: blade, scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), solarbladeMissText, [], 24);
                }
                if (p("solarblade", "charge", current) <= 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.6, 0)), solarbladeSunText, [], 24);
                done(current);
            }

            if (dash > 0.05) {
                // 位移用真实逐刻位置画拖尾：present 一个绑身体的 trail，身体每走一步由引擎沿历史补点；走不满就收脚。
                action.present("solarblade:dash", solarbladeScene, 1, origin,
                    JSON.stringify({ moment: "dash", blade: blade, scale: scale, intensity: intensity }));
                sound(action, "minecraft:entity.player.attack.sweep");
                const advance = function (current: CombatAction): void {
                    const scope = current.world();
                    const remaining = dash - travelled, piece = Math.min(step, remaining);
                    travelled += scope.displace(actor, heading.scale(piece));
                    if (travelled < dash - 0.02 && travelled > 0 && ++guard <= 12) { current.after(1, advance); return; }
                    cut(current);
                };
                advance(action);
                return;
            }
            cut(action);
        }
    });
}
