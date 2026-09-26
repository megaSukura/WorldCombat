/**
 * 潜水 / Dive — 世界内的动作。
 *
 * 核心念头：先沉下去，让一道水痕贴着地面替你走完最后一段路；水痕到哪儿，人就从哪儿窜出来，把站在
 * 那里的目标顶上天。喊出口的不是伤害数字，是"水痕正朝我脚边来"这条可读、可躲的线。
 *
 * 节奏（共享节奏）：windup 播放下潜预告（水面翻涌），可免费打断；提交后水痕从施法者脚下冲向提交那
 * 一刻锁死的落点，每刻推进一段并留下涟漪与气泡；抵达后施法者贴着目标身侧窜出，走同一条 hurt 路径
 * 结算物理伤害，再把目标向上顶飞、向后推开。
 *
 * 反制：落点在水痕出发前就锁死——可以锁实体，也可以锁一个空点。水痕行进期间横向走开、或退到锁定半径
 * 之外，窜出的这一击就会落空；目标躲开时不会追着改点。窜出读的是身体实际到达的位置，出水处的涌泉与
 * 水花都按那里结算。下潜预告可被打断且不花 PP。站在水里或软地上发动是深潜（射程、伤害、顶飞都更高），
 * 硬地上只是浅袭。
 *
 * 对象覆盖：伤害走 hurt（宝可梦、原版生物、其他模组生物、玩家同一条路），位移走 world.displace。
 * 非战斗：在水里下潜会浇灭自己身上的灼伤；窜出命中会把目标身上的火一起浇灭；落点留下一汪涌泉
 * （世界区域 world_combat:field/dive_spring），范围内的人被浇灭灼伤。涌泉范围内的地面火被永久浇灭
 * （world.breakBlock）：火是消耗品，灭了就是灭了，涌泉存续期间新冒出的火苗也会被一并浇下。
 */
namespace PokemonSkills {
    const DIVE_SCENE = "world_combat:move_dive";
    const DIVE_SPRING = "world_combat:field/dive_spring";

    function diveAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }
    function diveCap(point: CombatPoint, height: number): CombatPoint { return point.plus(WorldCombat.point(0, height, 0)); }

    /**
     * 浇灭一圈地面火：只认真正的火方块，不动营火等家具。火是消耗品，用 world.breakBlock 永久打掉，
     * 不再租借，也没有"水干后自己烧回来"这回事——涌泉在的时候，范围内新冒出的火苗会被继续浇灭。
     */
    function diveQuench(world: CombatWorld, centre: CombatPoint, radius: number): void {
        var r = Math.min(2, Math.ceil(Math.max(0.5, radius)));
        var seen: { [key: string]: boolean } = {};
        for (var dx = -r; dx <= r; dx++) {
            for (var dz = -r; dz <= r; dz++) {
                if (dx * dx + dz * dz > r * r + 0.5) continue;
                for (var dy = 1; dy >= -1; dy--) {
                    var point = centre.plus(WorldCombat.point(dx, dy, dz));
                    var block = world.block(point);
                    if (block === null) continue;
                    var id = String(block.id());
                    if (id !== "minecraft:fire" && id !== "minecraft:soul_fire") continue;
                    var fire = block.position(), key = fire.x() + "," + fire.y() + "," + fire.z();
                    if (seen[key]) continue;
                    seen[key] = true;
                    try { world.breakBlock(fire, false); } catch (error) { }
                }
            }
        }
    }
    // 窜出留下的涌泉：一块真实存在的世界区域。走过的人被浇灭灼伤，范围内的地面火被永久浇灭。
    // 对宝可梦、原版生物、其他模组生物与玩家是同一条路径（enter 只看燃烧身份）。
    WorldEffects.fieldRule(DIVE_SPRING, {
        enter: function (world: CombatWorld, actor: CombatActor): void {
            if (!CombatStatus.cure(world, actor, "burn")) return;
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, DIVE_SCENE, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 20);
        },
        scan: function (_effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            var centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            // 涌泉表现绑在场效果自己的 id 上：驱散、到期或提前结束时画面随之收走，不会比湿地多活一截。
            if (typeof field.id === "number" && field.id > 0)
                WorldFeedback.onEffect(world, field.id, "spring", DIVE_SCENE, 1, centre, { moment: "spring", scale: field.radius / 1.6 });
            diveQuench(world, centre, field.radius);
        }
    });

    /** 落点留下涌泉；半径与存续来自参数，随体型与等级变化。 */
    function diveSpring(world: CombatWorld, point: CombatPoint): void {
        var ticks = Math.max(20, Math.round(p("dive", "springTicks", world)));
        WorldEffects.field(world, DIVE_SPRING, point, Math.max(0.5, p("dive", "springRadius", world)),
            { source: String(world.source().ref()) }, ticks);
    }

    /**
     * 窜出读的是实际到达的位置：teleport 被落点保护或方块裁定拒绝时，位移能走到哪算哪；出水的身体、水柱
     * 与留下的涌泉都绑在身体真正所在处，返回那个位置供 hit 判定复用，没身体可观察时返回 null。
     */
    function diveSurface(world: CombatWorld, actor: CombatActor, point: CombatPoint, radius: number, deep: boolean, submerged: boolean): CombatPoint | null {
        if (!world.teleport(actor, point)) {
            var moving = world.observe(actor);
            if (moving !== null) {
                var foot = moving.position().minus(WorldCombat.point(0, moving.height() * 0.5, 0));
                world.displace(actor, point.minus(foot));
            }
        }
        var surfaced = world.observe(actor);
        if (surfaced === null) return null;
        var at = surfaced.position();
        WorldFeedback.emit(world, DIVE_SCENE, 1, at,
            { moment: "surface", target: String(actor.ref()), scale: radius / 0.5, deep: deep ? 1 : 0, wet: submerged ? 1 : 0 }, 26);
        world.sound("minecraft:entity.generic.splash", at, 16, "{}");
        diveSpring(world, at);
        return at;
    }

    define({
        freeMovement: true,
        id: "dive", name: "潜水",
        description: "沉下去后，一道水痕贴着地面冲向锁定的实体或空点，再从那里窜出：命中目标就造成物理伤害、把它向上顶飞并推开，并浇灭它身上的火；锁定空点也能真实换位，并在出水处留下一汪涌泉。水痕会把落点暴露出来，目标在它到达前退到锁定半径外就能让这一击落空；站在水里或软地上发动时更强、更远，硬地上只是短促的浅袭。",
        uses: ["绕后突袭", "贴身接近", "贴近远程对手"],
        kind: "aim", range: 12, maxRange: 16, active: 6, recover: 10, cooldown: 46, style: "water-dive",
        maximumTicks: 160,
        defaults: { deep: true },
        fields: [field(pathOf("deep"), "深潜", "boolean", { help: "开启：下潜更久、水痕更长、威力与顶飞更高、冷却更长；关闭（急袭）：射程更短、威力更低，但下潜与冷却都快。身在水里或软地上发动时整体再提高一档。" })],
        indicator: function (config, pokemon) {
            return { radius: p("dive", "lockRadius", pokemon), geometry: "line", style: "water-dive",
                label: diveDeep(config) ? "深潜突袭" : "急袭" };
        },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["dive"], detail: { values: config }, world: world || null, actor: actor || null };
            var deep = diveDeep(config), submerged = diveSubmerged(world, actor);
            var range = deep ? (submerged ? 15 : 7) : (submerged ? 10 : 6);
            return { prepare: p("dive", "submergeTicks", context), recover: p("dive", "recover", context) + (deep ? 2 : -4),
                cooldown: p("dive", "cooldown", context) + (deep ? 12 : -8), active: skills["dive"].active, range: range };
        },
        windup: function (action, config) {
            var body = action.sense().observe(action.actor());
            var wet = !!body && body.wet();
            action.present("dive:submerge", DIVE_SCENE, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "submerge", target: String(action.actor().ref()), wet: wet ? 1 : 0, deep: diveDeep(config) ? 1 : 0 }));
            return p("dive", "submergeTicks", action);
        },
        execute: function (action, move, config, done) {
            var world = action.world(), actor = action.actor();
            var body = world.observe(actor);
            if (body === null) { done(action); return; }
            var target = action.target();
            var landing = action.targetPosition();
            var deep = diveDeep(config), submerged = diveSubmerged(world, actor);
            var terrainFactor = submerged ? 1 + p("dive", "waterBonus", action) : 1;
            var depthScale = deep ? 1.1 : 0.85;
            var power = p("dive", "power", action) * terrainFactor;
            var launch = p("dive", "launch", action) * terrainFactor;
            var push = p("dive", "push", action) * terrainFactor * depthScale;
            var radius = p("dive", "collisionRadius", action);
            var lock = p("dive", "lockRadius", action);
            var surge = Math.max(0.6, p("dive", "surgeSpeed", action));
            // 非战斗：在水里下潜时浇灭自己身上的灼伤。
            if (submerged && CombatStatus.cure(world, actor, "burn")) {
                WorldFeedback.emit(world, DIVE_SCENE, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 24);
                WorldFeedback.text(world, diveAbove(body.position()), "world_combat.move.dive.text.douse", [], 24);
            }
            var start = body.position();
            var span = landing.minus(start).length();
            var travel = Math.max(3, Math.min(16, Math.round(span / surge)));
            var finished = false;
            function finish(current: CombatAction): void { if (!finished) { finished = true; done(current); } }
            function strike(current: CombatAction): void {
                var live = current.world(), liveActor = current.actor(), liveBody = live.observe(liveActor);
                if (liveBody === null) { finish(current); return; }
                var at = target === null ? null : live.observe(target);
                var outward = liveBody.position().minus(start);
                if (outward.length() < 0.01) outward = current.direction();
                var direction = outward.unit();
                // 只有锁定的敌人仍停在锁定接触区里才追着它窜出；目标躲开（或本就锁的是空点）就只在水痕尽头出水。
                if (target === null || at === null || at.health() <= 0 || at.position().minus(landing).length() > lock) {
                    var missed = diveSurface(live, liveActor, landing, radius, deep, submerged);
                    WorldFeedback.emit(live, DIVE_SCENE, 1, missed || landing, { moment: "whiff", target: target === null ? "" : String(target.ref()) }, 18);
                    WorldFeedback.text(live, diveAbove(missed || landing), "world_combat.move.dive.text.whiff", [], 26);
                    finish(current);
                    return;
                }
                var toward = liveBody.position().minus(at.position());
                if (toward.length() < 0.01) toward = direction.scale(-1);
                var point = at.position().minus(toward.unit().scale(1.1 + liveBody.width() * 0.5));
                var surfaced = diveSurface(live, liveActor, point, radius, deep, submerged);
                // 身体必须真的站到窜出点：传送失败、被挡在远处时只能空放，不能隔空伤人。
                var landedFoot = surfaced === null ? null : surfaced.minus(WorldCombat.point(0, liveBody.height() * 0.5, 0));
                if (landedFoot === null || landedFoot.minus(point).length() > 1.0) {
                    WorldFeedback.emit(live, DIVE_SCENE, 1, surfaced || point, { moment: "whiff", target: String(target.ref()) }, 18);
                    WorldFeedback.text(live, diveAbove(surfaced || point), "world_combat.move.dive.text.whiff", [], 26);
                    finish(current);
                    return;
                }
                var before = at.health();
                if (!hurt(current, target, move.id(), power, { contact: true })) {
                    WorldFeedback.emit(live, DIVE_SCENE, 1, at.position(), { moment: "whiff", target: String(target.ref()) }, 18);
                    WorldFeedback.text(live, diveAbove(at.position()), "world_combat.move.dive.text.whiff", [], 26);
                    finish(current);
                    return;
                }
                var after = live.observe(target);
                var dealt = after ? Math.max(0, before - after.health()) : before;
                var shove = at.position().minus(point);
                var away = shove.length() < 0.01 ? WorldCombat.point(0, 0, 0) : shove.unit().scale(push);
                if (live.valid(target)) live.displace(target, WorldCombat.point(0, launch, 0).plus(away));
                // 窜出的水把目标身上的火一起浇灭——水系突袭最实用的一手。
                if (CombatStatus.cure(live, target, "burn")) {
                    WorldFeedback.emit(live, DIVE_SCENE, 1, at.position(), { moment: "douse", target: String(target.ref()) }, 22);
                    WorldFeedback.text(live, diveAbove(at.position()), "world_combat.move.dive.text.douse", [], 24);
                }
                WorldFeedback.emit(live, DIVE_SCENE, 1, at.position(),
                    { moment: "impact", target: String(target.ref()), intensity: 1 + Math.min(1, dealt / Math.max(1, at.maxHealth())) * 4 }, 28);
                WorldFeedback.text(live, diveAbove(at.position()), "world_combat.move.dive.text.hit", [Math.round(dealt * 10) / 10], 30);
                finish(current);
            }
            function wake(current: CombatAction, step: number): void {
                var live = current.world();
                if (step > travel) { strike(current); return; }
                var progress = step / travel;
                var point = start.plus(landing.minus(start).scale(progress));
                WorldFeedback.keep(live, "dive:wake", DIVE_SCENE, 1, diveCap(point, 0.05),
                    { moment: "wake", target: String(actor.ref()), progress: progress, deep: deep ? 1 : 0, wet: submerged ? 1 : 0 }, 8);
                current.after(1, function (next) { wake(next, step + 1); });
            }
            wake(action, 0);
        }
    });
}
