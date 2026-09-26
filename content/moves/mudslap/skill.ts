/**
 * 掷泥 / mudslap 的出手方式。
 *
 * 核心念头：抓起一把湿泥甩到对手脸上——泥糊住眼睛，这一下会让它之后瞄不准；本身很轻，价值全在遮眼。
 *
 * 选取：kind 为 aim——可以锁定一个实体、也可以朝一个方向或世界点甩出；提交与执行都不要求存在敌人。
 *   选中的实体只是辅助瞄准，目标离场或朝空地空放时，泥团沿原方向落空。
 *
 * 三幕：
 *   起：泥在身前收拢成团（提交前 windup 预告）。
 *   抛：提交后泥团沿低弧线飞出，身后甩出细小泥点。
 *   糊：命中活物时在接触面溅开泥花、挂上泥印；只有这一下真的造成伤害，才降低命中能力等级并浮出级数。
 *       打在方块上只留一块按真实表面朝向铺开的泥印，不会形成危险泥区。
 *
 * 与同族分开：泥巴炸弹是直线高速的硬弹、命中炸开；掷泥是低弧线的软泥团，命中只是糊在脸上，伤害轻得多。
 * 命中下降走共享能力等级（NativeEffects.boost 的 accuracy），与影子分身的闪避一样走全战斗者共有的载体；
 * 脸上泥迹用同一份机制值（级数、威力、泥点数量）画出来。
 */
namespace PokemonSkills {
    const mudslapScene = "world_combat:move_mudslap";

    /** 方块表面的外法线，用来把接触侧泥印贴到真实那一面；没有具体方块朝向时朝上。 */
    function mudslapNormal(face: string): number[] {
        if (face === "down") return [0, -1, 0];
        if (face === "north") return [0, 0, -1];
        if (face === "south") return [0, 0, 1];
        if (face === "west") return [-1, 0, 0];
        if (face === "east") return [1, 0, 0];
        return [0, 1, 0];
    }

    define({
        id: "mudslap",
        name: "Mud-Slap",
        description: "抓起一把湿泥甩向瞄准方向或落点；打中活物造成很轻的伤害，并必定降低它的命中率。可以朝空地甩出，泥团打在方块上只留一块泥印。",
        uses: ["近中距离先手糊脸，必定削命中", "给接下来要放的大招铺路", "低消耗的稳定小伤害"],
        kind: "aim",
        range: 10,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 6,
        cooldown: 36,
        style: "mud",
        defaults: { thick: false, ai: { maxChase: 14, leaveStation: true } },
        fields: [
            flag("thick", "厚泥")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["mudslap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !!(config && config.thick);
            return { prepare: Math.round(p("mudslap", "tempo", context)), recover: 6,
                cooldown: 36 + (thick ? 6 : 0), active: 0, range: p("mudslap", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("mudslap:gather", mudslapScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 0.5, geometry: "point", style: "mud", color: 0x6E5438, label: "掷泥" }; },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const speed = p("mudslap", "arcSpeed", action);
            const gravity = p("mudslap", "gravity", action);
            const radius = p("mudslap", "radius", action);
            const power = p("mudslap", "splat", action);
            const blind = Math.max(1, Math.round(p("mudslap", "blind", action)));
            const steer = p("mudslap", "steer", action);
            const mudTicks = Math.max(20, Math.round(p("mudslap", "mudTicks", action)));
            const splash = Math.max(8, Math.round(p("mudslap", "splash", action)));
            // 选中的实体只用于辅助瞄准；没有实体（方向/世界点）时按提交方向飞。
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const scale = body === null ? 1 : (body.width() + body.height()) / 2.3;
            const intensity = Math.max(0.5, Math.min(2.2, power / 22));
            const launch = LivingActions.ballistic(origin, action.targetPosition(), speed, gravity);
            sound(action, "cobblemon:move.mudsport.actor");
            let settled = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity,
                direction: launch === null ? undefined : launch, lifetime: 220,
                appearance: { sprite: "cobblemon:particle/generic/mud/mudbubble", scale: Math.max(0.6, radius / 0.2),
                    homing: targetRef === "" ? undefined : { target: targetRef, turn: steer, delay: 1, range: action.range() } },
                impact: function (current, hit) {
                    const currentWorld = current.world();
                    const target = hit.target();
                    const point = hit.position();
                    const cell = hit.blockPosition();
                    const delta = point.minus(origin);
                    const away = delta.length() < 0.01 ? WorldCombat.point(0, 1, 0) : delta.unit();
                    const normal = cell !== null ? mudslapNormal(hit.blockFace()) : [away.x(), away.y(), away.z()];
                    // 活物命中：只有伤害真正落地，才削命中并播糊脸；伤害被拒绝时不假显示成功。
                    if (target !== null && currentWorld.valid(target) && !currentWorld.friendly(target)) {
                        const landed = impact(current, hit, "mudslap", power, { damage: damageSpec("mudslap", "splat") });
                        const at = currentWorld.observe(target);
                        if (landed && at !== null) {
                            const dropped = NativeEffects.boost(currentWorld, target, "accuracy", -blind);
                            WorldFeedback.keep(currentWorld, "mudslap:face:" + String(target.ref()), mudslapScene, 1, at.position(),
                                { moment: "face", target: String(target.ref()), stage: blind, splash: splash, intensity: intensity, tick: mudTicks }, mudTicks);
                            if (dropped !== 0)
                                WorldFeedback.text(currentWorld, at.position().plus(WorldCombat.point(0, 1.1, 0)),
                                    "world_combat.move.mudslap.text.blind", [Math.abs(dropped)], 30);
                        }
                    }
                    // 接触侧泥印：按真实命中点与表面朝向画；方块不受影响，不产生危险泥区。
                    WorldFeedback.emit(currentWorld, mudslapScene, 1, point,
                        { moment: "splat", target: target === null ? "" : String(target.ref()), splash: splash, stage: blind,
                            intensity: intensity, scale: scale, direction: normal }, 26);
                    sound(current, "minecraft:block.mud.break");
                }
            }, function (current) { if (!settled) { settled = true; done(current); } });
            WorldFeedback.emit(world, mudslapScene, 1, origin,
                { moment: "throw", projectile: flight, scale: scale, intensity: intensity }, 60);
        }
    });
}
