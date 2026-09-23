/**
 * 直冲钻 / drillrun 的出手方式。
 *
 * 核心念头：蹲身起旋，把身体拧成一支钢钻，贴着地面直线钻出去——钻尖咬穿沿途挡路的一切，
 * 一路把地表犁开一道沟，钻到尽头才收势。它不绕路、不停下，是四记要害斩里唯一把地面犁出痕迹的一击。
 *
 * 三幕：
 *   起（windup，提交前）：脚下扬起一圈尘、身体先转起来，只播预告，可被打断。
 *   钻（spin → bore，提交后）：沿瞄准方向逐刻高速旋转前进；每刻把前进路径扫一遍，撞上非友方活体就
 *       结算 `bit` 接触伤害，按 `push` 把对手顶开以便钻穿，最多贯穿 `through` 个目标。
 *   犁（furrow）：钻过后把沿途自然地表换成同一层的粗土，走 world.terrain 租约（replace 盖住、linger 活过招式），
 *       `scarTicks` 后原方块自己回来；没钻到人则在尽头留一声空响。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的钻花。
 *
 * 与同族分开：铁头是短步砸一下、把目标掀开；直冲钻是旋转着直线钻穿、能连续咬多个目标，且在地上留下一条沟。
 */
namespace PokemonSkills {
    const DRILLRUN_SURFACE = ["dirt", "grass_block", "sand", "gravel", "clay", "mud", "podzol", "mycelium",
        "coarse_dirt", "rooted_dirt", "moss", "stone", "deepslate", "cobblestone", "granite", "diorite",
        "andesite", "tuff", "calcite", "basalt", "blackstone", "terracotta", "sandstone", "red_sand", "snow",
        "farmland", "path", "netherrack", "end_stone"];

    /** 钻头只犁自然地表；矿石、建材、液体与空气一律放过，别打扰采集与建筑。 */
    function drillrunPlowable(block: CombatBlock): boolean {
        const id = block.id();
        if (id.indexOf("air") >= 0 || id.indexOf("water") >= 0 || id.indexOf("lava") >= 0) return false;
        if (id.indexOf("ore") >= 0 || id.indexOf("redstone") >= 0 || id.indexOf("brick") >= 0) return false;
        for (let index = 0; index < DRILLRUN_SURFACE.length; index++) if (id.indexOf(DRILLRUN_SURFACE[index]) >= 0) return true;
        return false;
    }

    /** 从一列顶上找到第一块自然地表，记为待替换的格子；同一格只记一次。 */
    function drillrunColumn(world: CombatWorld, column: CombatPoint, cells: any[], seen: { [key: string]: boolean }): boolean {
        for (let dy = 0; dy <= 3; dy++) {
            const probe = world.block(column.plus(WorldCombat.point(0, -dy, 0)));
            if (probe === null || !drillrunPlowable(probe)) continue;
            const at = probe.position(), key = at.x() + "," + at.y() + "," + at.z();
            if (seen[key]) return false;
            seen[key] = true;
            cells.push({ x: at.x(), y: at.y(), z: at.z(), block: "minecraft:coarse_dirt" });
            return true;
        }
        return false;
    }

    /** 把沿途采样点的自然地表换成粗土，形成一道犁沟；租约到期原方块回来，不掉落、不挖空。 */
    function drillrunFurrow(world: CombatWorld, samples: CombatPoint[], limit: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null);
        let travelled = 0, previous: CombatPoint | null = null;
        for (let index = 0; index < samples.length && travelled <= limit; index++) {
            if (previous !== null) travelled += samples[index].minus(previous).length();
            if (travelled > limit) break;
            previous = samples[index];
            drillrunColumn(world, samples[index], cells, seen);
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: drillrunId,
        cooldownParameter: "recharge",
        name: "Drill Run",
        description: "The user crashes into the target while rotating its body like a drill. This move has a heightened chance of landing a critical hit.",
        uses: ["旋转着直线钻穿挡路的目标", "钻完在地上留下一条犁沟", "一路能连续咬穿多个对手"],
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
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const length = p(drillrunId, "charge", action);
            const speed = p(drillrunId, "thrust", action);
            const radius = p(drillrunId, "drill", action);
            const power = p(drillrunId, "bit", action);
            const through = Math.max(1, Math.round(p(drillrunId, "through", action)));
            const push = p(drillrunId, "push", action);
            const furrow = p(drillrunId, "furrow", action);
            const scarTicks = Math.max(80, Math.round(p(drillrunId, "scarTicks", action)));
            const sparks = Math.max(6, Math.round(p(drillrunId, "sparks", action)));
            const traceAhead = p(drillrunId, "traceAhead", action);
            const minimum = p(drillrunId, "minimumMove", action);
            const scale = Math.max(0.5, Math.min(2.2, radius / drillrunReference));
            const intensity = Math.max(0.5, Math.min(2.4, power / 85));
            const samples: CombatPoint[] = [];
            const hitSet: { [ref: string]: boolean } = Object.create(null);
            let travelled = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                const placed = drillrunFurrow(scope, samples, furrow, scarTicks);
                WorldFeedback.emit(scope, drillrunScene, 1, at,
                    { moment: "furrow", cells: placed, furrow: furrow, hits: hits, sparks: sparks, scale: scale }, 34);
                if (hits === 0) {
                    WorldFeedback.emit(scope, drillrunScene, 1, at, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), drillrunMissText, [], 20);
                    sound(current, "minecraft:block.gravel.break");
                }
                done(current);
            }

            sound(action, "minecraft:item.trident.riptide_1");

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.001) { finish(current); return; }
                const delta = direction.scale(Math.min(speed, remaining));
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                let drilled = false;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && !hitSet[String(victim.ref())]) {
                        drilled = true;
                        if (hits < through) {
                            hitSet[String(victim.ref())] = true;
                            hits++;
                            const at = hit.position();
                            const landed = impact(current, hit, drillrunId, power,
                                { damage: damageSpec(drillrunId, "bit"), contact: true });
                            WorldFeedback.emit(scope, drillrunScene, 1, at,
                                { moment: "bore", target: String(victim.ref()), hits: hits, sparks: sparks,
                                    scale: scale, intensity: intensity }, 24);
                            if (landed && scope.valid(victim)) {
                                scope.displace(victim, direction.scale(push));
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), drillrunHitText, [], 20);
                            }
                            scope.sound("cobblemon:impact.ground", at, 14, "{}");
                            scope.sound("minecraft:block.stone.break", at, 10, "{}");
                        }
                    }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (samples.length === 0 || samples[samples.length - 1].minus(origin).length() >= 0.5) samples.push(origin);
                WorldFeedback.keep(scope, "drillrun:spin:" + current.id(), drillrunScene, 1, origin,
                    { moment: "spin", scale: scale, intensity: intensity, sparks: Math.round(sparks * Math.min(1, travelled / Math.max(0.001, length))),
                        progress: Math.min(1, travelled / Math.max(0.001, length)) }, 8);
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
