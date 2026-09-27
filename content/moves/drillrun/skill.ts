/**
 * 直冲钻 / drillrun 的出手方式。
 *
 * 核心念头：蹲身起旋，把身体拧成一支钢钻，贴着地面直线钻出去——钻尖咬穿沿途挡路的一切，钻到尽头才收势。
 * 它不绕路、不停下，是四记要害斩里唯一贴着地面把人钻穿的一击。
 *
 * 三幕：
 *   起（windup，提交前）：脚下扬起一圈尘、身体先转起来，只播预告，可被打断。
 *   钻（spin → bore，提交后）：沿瞄准的水平方向逐段用原生身体扫掠前进；每段扫到非友方活体就
 *       结算 `bit` 接触伤害，只有伤害真的被接受才计数、才按 `push` 用 hitDisplace 把对手顶开以便继续钻穿，
 *       最多贯穿 `through` 个目标。撞上实墙就停在墙前，不越过下一实体。
 *   尘（dust）：沿真实走过的地面采样点扬起一道短地尘，不改变任何方块。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的钻花。
 *
 * 与同族分开：铁头是短步砸一下、把目标掀开；直冲钻是旋转着直线钻穿、能连续咬多个目标，钻轴对准行进方向。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: drillrunId,
        cooldownParameter: "recharge",
        name: "Drill Run",
        description: "蹲身起旋，把身体拧成一支钢钻贴地直线钻出去：沿途每个挡路的对手被钻尖咬一下，最多贯穿多个；钻过之后沿路扬起一道贴地短尘。它是一记会位移、会留下真实地尘的接触招，暴击率比同族高一档。",
        uses: ["旋转着直线钻穿挡路的目标", "钻过后在地面扬起一道短尘", "一路能连续咬穿多个对手"],
        kind: "enemy",
        range: 3.0,
        maxRange: 5.6,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "ground-drill",
        defaults: { carve: false, ai: { maxChase: 7, line: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(drillrunId, "drill", pokemon) * 1.6, geometry: "line", style: "ground", color: 0xC9A66B,
                label: config && config.carve === true ? "重钻" : "直冲钻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[drillrunId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(drillrunId, "tempo", context)),
                recover: Math.round(p(drillrunId, "aftercast", context)),
                cooldown: Math.round(p(drillrunId, "recharge", context)),
                active: 0,
                range: p(drillrunId, "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_drillrun:windup", drillrunScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", carve: config && config.carve === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(drillrunScene);
            const world = action.world();
            const actor = action.actor();
            const aimed = aim(action);
            // 贴地投影：钻头只沿水平方向前进，向下瞄准也不会一头扎进地面。
            const direction = WorldGeometry.flatUnit(aimed, action.direction());
            const length = p(drillrunId, "charge", action);
            const speed = p(drillrunId, "thrust", action);
            const radius = p(drillrunId, "drill", action);
            const power = p(drillrunId, "bit", action);
            const through = Math.max(1, Math.round(p(drillrunId, "through", action)));
            const push = p(drillrunId, "push", action);
            const dustLimit = p(drillrunId, "furrow", action);
            const dustTicks = Math.max(80, Math.round(p(drillrunId, "scarTicks", action)));
            const sparks = Math.max(6, Math.round(p(drillrunId, "sparks", action)));
            const minimum = p(drillrunId, "minimumMove", action);
            const scale = Math.max(0.5, Math.min(2.2, radius / drillrunReference));
            const intensity = Math.max(0.5, Math.min(2.4, power / 85));
            const heading = [direction.x(), direction.y(), direction.z()];
            const samples: CombatPoint[] = [];
            const hitSet: { [ref: string]: boolean } = Object.create(null);
            let travelled = 0, hits = 0, settled = false;
            let blockedAt: CombatPoint | null = null, blockedFace = "";

            /** 记录真实经过的地面采样点；只用于贴地短尘，不改变方块。 */
            function record(scope: CombatWorld, point: CombatPoint): void {
                const grounded = WorldGeometry.ground(scope, point);
                if (samples.length === 0 || samples[samples.length - 1].minus(grounded).length() >= 0.5) samples.push(grounded);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                if (samples.length === 0 || samples[samples.length - 1].minus(WorldGeometry.ground(scope, at)).length() > 0.05) samples.push(WorldGeometry.ground(scope, at));
                // 沿真实走过的地面点取出短尘路径，长度由 furrow 预算封顶。
                const path: number[][] = [];
                let walked = 0, previous: CombatPoint | null = null;
                for (let index = 0; index < samples.length && walked <= dustLimit; index++) {
                    if (previous !== null) walked += samples[index].minus(previous).length();
                    if (walked > dustLimit) break;
                    previous = samples[index];
                    path.push([samples[index].x(), samples[index].y(), samples[index].z()]);
                }
                WorldFeedback.emit(scope, drillrunScene, 1, at,
                    { moment: "dust", path: path, dustTicks: dustTicks, hits: hits, sparks: sparks, scale: scale }, dustTicks);
                // 钻头在实墙处收束：只在这一刻留一簇火花，不再扩成继续钻墙的动作。
                if (blockedAt !== null) {
                    WorldFeedback.emit(scope, drillrunScene, 1, blockedAt,
                        { moment: "blocked", face: blockedFace, sparks: sparks, scale: scale, direction: heading }, 20);
                }
                if (hits === 0) {
                    WorldFeedback.emit(scope, drillrunScene, 1, at, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), drillrunMissText, [], 20);
                    sound(current, "minecraft:block.gravel.break");
                }
                movementScenes.finish(current, done);
            }

            sound(action, "minecraft:item.trident.riptide_1");

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.001) { finish(current); return; }
                const delta = direction.scale(Math.min(speed, remaining));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.blocked() && !hit.hitEntity()) {
                    blockedAt = hit.position();
                    blockedFace = hit.blockFace();
                }
                let drilled = false;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && !hitSet[String(victim.ref())]) {
                        hitSet[String(victim.ref())] = true;
                        // 贯穿名额用尽后不再咬新目标，钻头会被它挡住停下。
                        if (hits < through) {
                            const at = hit.position();
                            const landed = impact(current, hit, drillrunId, power,
                                { damage: damageSpec(drillrunId, "bit"), contact: true });
                            // 只有伤害真的被接受才计数、才报钻穿、才顶开对手。
                            if (landed && scope.valid(victim)) {
                                hits++;
                                drilled = true;
                                scope.hitDisplace(victim, direction.scale(push));
                                WorldFeedback.emit(scope, drillrunScene, 1, at,
                                    { moment: "bore", target: String(victim.ref()), hits: hits, sparks: sparks,
                                        scale: scale, intensity: intensity }, 24);
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), drillrunHitText, [], 20);
                                scope.sound("cobblemon:impact.ground", at, 14, "{}");
                                scope.sound("minecraft:block.stone.break", at, 10, "{}");
                            }
                        }
                    }
                }
                // 不额外 displace 跳过下一实体：只走原生扫掠实际给出的位移，剩余交给下一段继续扫。
                const moved = swept.moved;
                travelled += moved;
                record(scope, origin);
                movementScenes.show(current, "spin", origin,
                    { moment: "spin", scale: scale, intensity: intensity,
                        sparks: Math.round(sparks * Math.min(1, travelled / Math.max(0.001, length))),
                        progress: Math.min(1, travelled / Math.max(0.001, length)),
                        direction: heading });
                // 撞墙或撞到没被顶开的实体就停下；被钻到的目标已被顶开，钻头得以继续前进。
                if (hit.blocked() || moved < minimum && !drilled) { finish(current); return; }
                if (travelled >= length) { finish(current); return; }
                current.after(1, advance);
            }

            WorldFeedback.emit(world, drillrunScene, 1, action.origin(),
                { moment: "windup", carve: !!(config && config.carve), scale: scale }, 16);
            advance(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的钻花与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_drillrun/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== drillrunId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, drillrunScene, 1, at,
            { moment: "crit", target: String(target.ref()), sparks: Math.max(10, Math.min(40, Math.round(ratio * 3))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), drillrunVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
