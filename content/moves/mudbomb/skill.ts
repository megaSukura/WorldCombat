/**
 * 泥巴炸弹 / mudbomb 的出手方式。
 *
 * 核心念头：把泥压实成一颗硬球掷出，直线砸到对手身上炸开——伤害重，但只有约三成机会把泥雾糊进它的眼睛；
 * 炸过的地方留一小片湿泥。
 *
 * 三幕：
 *   起：泥在身前被压实、边转边收紧（提交前 windup 预告）。
 *   飞：提交后泥弹沿直线高速飞出，带旋转与泥屑尾迹。
 *   爆：命中处炸开泥雾，泼溅到附近其他敌人；地上按撞击点留一片湿泥（到期原方块回来）；
 *       按概率把命中下降挂到主目标身上。
 *
 * 与同族分开：掷泥是低弧线的软泥团、必定糊眼、伤害轻；泥巴炸弹是直线硬弹、爆开泼溅、只有概率致盲。
 */
namespace PokemonSkills {
    const mudbombScene = "world_combat:move_mudbomb";

    /** 在落点下方找第一块实心方块，替换成一小片泥；到期原方块回来，活物站在格子里时等它走开再合上。 */
    function mudbombPatch(world: CombatWorld, point: CombatPoint, ticks: number): boolean {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dy = 0; dy <= 3; dy++) {
            const y = base - dy;
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            world.terrain(JSON.stringify({ cells: [{ x: x, y: y, z: z, block: "minecraft:mud" }], replace: true, linger: true }), ticks);
            return true;
        }
        return false;
    }

    define({
        id: "mudbomb",
        name: "Mud Bomb",
        description: "The user launches a hard-packed mud ball to attack. This may also lower the target's accuracy.",
        uses: ["中远距离的直线重击", "用爆开泼溅打到目标身边的敌人", "偶尔糊眼，削掉对手的命中"],
        kind: "enemy",
        range: 14,
        maxRange: 22,
        prepare: 14,
        active: 0,
        recover: 8,
        cooldown: 42,
        style: "mud",
        defaults: { shell: false, ai: { maxChase: 18, crowd: true, leaveStation: true } },
        fields: [
            flag("shell", "碎壳")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["mudbomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const shell = !!(config && config.shell);
            return { prepare: Math.round(p("mudbomb", "tempo", context)), recover: 8,
                cooldown: 42 + (shell ? 4 : 0), active: 0, range: p("mudbomb", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("mudbomb:pack", mudbombScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", shell: config && config.shell ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 0.7, geometry: "area", style: "mud", color: 0x6E5A40, label: "泥巴炸弹" }; },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const velocity = p("mudbomb", "velocity", action);
            const gravity = p("mudbomb", "gravity", action);
            const radius = p("mudbomb", "radius", action);
            const power = p("mudbomb", "boom", action);
            const splashPower = p("mudbomb", "splash", action);
            const blast = p("mudbomb", "blastRadius", action);
            const blind = Math.max(1, Math.round(p("mudbomb", "blind", action)));
            const chance = p("mudbomb", "chance", action);
            const shards = Math.max(8, Math.round(p("mudbomb", "shards", action)));
            const patchTicks = Math.max(40, Math.round(p("mudbomb", "patchTicks", action)));
            const scale = body === null ? 1 : (body.width() + body.height()) / 2.3;
            const intensity = Math.max(0.6, Math.min(2.4, power / 65));
            sound(action, "cobblemon:move.mudbomb.actor");
            let settled = false;
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, gravity: gravity, lifetime: 200,
                appearance: { sprite: "cobblemon:particle/moves/mudbomb", scale: Math.max(0.7, radius / 0.24) },
                impact: function (current, hit) {
                    const currentWorld = current.world();
                    const target = hit.target();
                    const point = hit.position();
                    let primary: CombatActor | null = null;
                    if (target !== null && currentWorld.valid(target) && !currentWorld.friendly(target)) {
                        primary = target;
                        impact(current, hit, "mudbomb", power, { damage: damageSpec("mudbomb", "boom") });
                        if (currentWorld.random() < chance) {
                            NativeEffects.boost(currentWorld, target, "accuracy", -blind);
                            const at = currentWorld.observe(target);
                            if (at !== null) {
                                WorldFeedback.keep(currentWorld, "mudbomb:face:" + String(target.ref()), mudbombScene, 1, at.position(),
                                    { moment: "face", target: String(target.ref()), stage: blind, shards: shards, intensity: Math.max(0.4, Math.min(1.6, power / 70)) }, 70);
                                WorldFeedback.text(currentWorld, at.position().plus(WorldCombat.point(0, 1.1, 0)),
                                    "world_combat.move.mudbomb.text.blind", [blind], 30);
                            }
                        }
                    }
                    const region = WorldGeometry.ring(point, 0, blast, { below: 2, above: 3 });
                    let splashed = 0;
                    WorldGeometry.selectEnemies(currentWorld, region, function (other, facts) {
                        if (primary !== null && String(other.ref()) === String(primary.ref())) return;
                        hurt(current, other, "mudbomb", splashPower, { damage: damageSpec("mudbomb", "splash") });
                        splashed++;
                        WorldFeedback.emit(currentWorld, mudbombScene, 1, facts.position(),
                            { moment: "spray", target: String(other.ref()), intensity: Math.max(0.4, Math.min(1.6, splashPower / 30)), scale: scale }, 22);
                    });
                    currentWorld.explode(point, Math.max(0.6, Math.min(2.6, blast * 0.6)), JSON.stringify({ damage: false }));
                    WorldFeedback.emit(currentWorld, mudbombScene, 1, point,
                        { moment: "burst", target: target === null ? "" : String(target.ref()), shards: shards, blast: blast,
                            splashed: splashed, intensity: intensity, scale: scale }, 30);
                    mudbombPatch(currentWorld, point, patchTicks);
                    sound(current, "cobblemon:move.mudbomb.target");
                }
            }, function (current) { if (!settled) { settled = true; done(current); } });
            WorldFeedback.emit(world, mudbombScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity }, 60);
        }
    });
}
