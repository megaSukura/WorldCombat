/**
 * 泥巴射击 / mudshot 的出手方式。
 *
 * 核心念头：把一团湿泥压成扁块贴着地面甩出去——泥块平飞、又快又阔，命中时在目标脚下炸开，泥浆顺着溅开的范围
 * 糊上附近所有敌人的腿脚，谁被糊住谁的步子就沉下去；落点地上留下一片湿泥。
 *
 * 三幕：
 *   起（gather，提交前）：泥在脚边收拢成一块扁泥，只播预告。
 *   飞（streak，提交后）：泥块沿低弧平飞，身后甩出细小泥点，抛物线让对手读得出落点。
 *   泼（splash → mire / coated / slick）：命中处炸开一圈低平的泥花；主目标吃 `spray` 伤害并被 mired 糊腿、
 *       掉速度等级；泼溅圈里其余敌人只被糊腿、不吃伤害；落点地上按 `splash` 半径铺一片 `minecraft:mud`（租借、到期归还）。
 *
 * 与同族分开：泥巴炸弹是直线硬弹炸开、削命中；掷泥是低弧软泥团糊脸；泥巴射击是**贴地阔泼**，掉的是速度，
 * 糊的是腿脚，落点留泥洼。速度下降走 `NativeEffects.boost` 的共享速度等级，对宝可梦和其他生物同一条路。
 */
namespace PokemonSkills {
    const mudshotScene = "world_combat:move_mudshot";
    const mudshotMire = "world_combat:mudshot_mire";
    const mudshotMireText = "world_combat.move.mudshot.text.mire";

    /** 在落点下方找第一块实心方块，按半径把它换成一层湿泥；到期原方块回来，活物站在格子里时等它走开再合上。 */
    function mudshotSlick(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius);
        const bx = Math.floor(point.x()), bz = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            for (let dy = 0; dy <= 3; dy++) {
                const y = base - dy, block = world.block(WorldCombat.point(bx + dx, y, bz + dz));
                if (block === null) continue;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") break;
                cells.push({ x: bx + dx, y: y, z: bz + dz, block: "minecraft:mud" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    /** 糊住一名战斗者的腿脚：共享速度等级下降，并挂上 mired 身份（宝可梦、原版生物、玩家同一条路）。 */
    function mudshotCoat(world: CombatWorld, target: CombatActor, stages: number, ticks: number): void {
        NativeEffects.boost(world, target, "spe", -stages);
        MobEffects.apply(world, target, mudshotMire, Math.max(20, Math.round(ticks)), 0);
    }

    define({
        id: "mudshot",
        name: "Mud Shot",
        description: "The user attacks by hurling a blob of mud at the target. This also lowers the target's Speed stat.",
        uses: ["中距离点掉跑得快的对手", "先糊腿，再用更重的招收掉", "顺手把目标身边一群人的速度压下去"],
        kind: "enemy",
        range: 11,
        maxRange: 18,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 34,
        style: "mud",
        defaults: { wide: false, ai: { maxChase: 14, crippleRunners: true } },
        fields: [
            flag("wide", "阔泼")
        ],
        indicator: function (config, pokemon) {
            return { radius: p("mudshot", "splash", pokemon), geometry: "line", style: "mud",
                color: 0x6E5438, label: config && config.wide === true ? "泥巴射击·阔泼" : "泥巴射击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["mudshot"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const wide = !!(config && config.wide);
            return { prepare: Math.round(p("mudshot", "tempo", context)), recover: 7,
                cooldown: 34 + (wide ? 6 : 0), active: 0, range: p("mudshot", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_mudshot:gather", mudshotScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", wide: config && config.wide ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.3, 0));
            const speed = p("mudshot", "velocity", action);
            const gravity = p("mudshot", "gravity", action);
            const radius = p("mudshot", "legRadius", action);
            const power = p("mudshot", "spray", action);
            const splash = p("mudshot", "splash", action);
            const stages = Math.max(1, Math.round(p("mudshot", "slowStages", action)));
            const slowTicks = Math.max(30, Math.round(p("mudshot", "slowTicks", action)));
            const coat = Math.max(10, Math.round(p("mudshot", "coat", action)));
            const slickTicks = Math.max(40, Math.round(p("mudshot", "slickTicks", action)));
            const wide = !!(config && config.wide);
            const scale = body === null ? 1 : (body.width() + body.height()) / 2.3;
            const intensity = Math.max(0.5, Math.min(2.2, power / 50));
            const launch = LivingActions.ballistic(origin, action.targetPosition(), speed, gravity);
            sound(action, "cobblemon:move.mudbomb.actor");
            let settled = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity,
                direction: launch === null ? undefined : launch, lifetime: 200,
                appearance: { sprite: "cobblemon:generic/mud/mudsplash", scale: Math.max(0.6, radius / 0.2) },
                impact: function (current, hit) {
                    const scope = current.world();
                    const hitTarget = hit.target();
                    const point = hit.position();
                    let primary: CombatActor | null = null;
                    if (hitTarget !== null && scope.valid(hitTarget) && !scope.friendly(hitTarget)) {
                        primary = hitTarget;
                        impact(current, hit, "mudshot", power, { damage: damageSpec("mudshot", "spray") });
                        if (scope.valid(hitTarget)) {
                            mudshotCoat(scope, hitTarget, stages, slowTicks);
                            const at = scope.observe(hitTarget);
                            if (at !== null) {
                                WorldFeedback.keep(scope, "mudshot:mire:" + String(hitTarget.ref()), mudshotScene, 1, at.position(),
                                    { moment: "mire", target: String(hitTarget.ref()), stages: stages, coat: coat,
                                        intensity: intensity, tick: slowTicks }, slowTicks);
                                WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), mudshotMireText, [stages], 30);
                            }
                        }
                    }
                    // 溅开的泥浆只糊腿、不造成伤害：泼溅圈里其余敌人一起掉速度。
                    let coated = 0;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, Math.max(0.6, splash), { below: 1.6, above: 1.4 }),
                        function (other) {
                            if (primary !== null && String(other.ref()) === String(primary.ref())) return;
                            mudshotCoat(scope, other, stages, Math.round(slowTicks * 0.7));
                            coated++;
                            const skin = scope.observe(other);
                            if (skin !== null) WorldFeedback.emit(scope, mudshotScene, 1, skin.position(),
                                { moment: "coated", target: String(other.ref()), coat: Math.round(coat * 0.6),
                                    intensity: Math.max(0.4, intensity * 0.7), scale: scale }, 22);
                        });
                    const slick = mudshotSlick(scope, point, Math.max(0.6, splash), slickTicks);
                    WorldFeedback.emit(scope, mudshotScene, 1, point,
                        { moment: "splash", target: hitTarget === null ? "" : String(hitTarget.ref()), coat: coat, coated: coated,
                            intensity: intensity, scale: Math.max(0.6, splash) / 0.9 }, 28);
                    WorldFeedback.emit(scope, mudshotScene, 1, point,
                        { moment: "slick", radius: Math.max(0.6, splash), slick: slick, tick: slickTicks,
                            scale: Math.max(0.6, splash) / 0.9 }, slickTicks);
                    sound(current, "minecraft:block.mud.break");
                }
            }, function (current) { if (!settled) { settled = true; done(current); } });
            WorldFeedback.emit(world, mudshotScene, 1, origin,
                { moment: "streak", projectile: flight, intensity: intensity, wide: wide ? 1 : 0 }, 60);
        }
    });
}
