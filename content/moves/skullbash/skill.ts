/**
 * 火箭头锤 / Skull Bash — 执行组织。
 *
 * 念头：缩头护住要害，把护住的头当撞锤——蓄力越久，撞得越重越远，站桩也越久。
 *
 * 出手：提交后立刻缩头蹲桩；给自身挂 rooted（不能移动）、加原版护甲、提升原生防御，并用共用的
 *       GuardEffects 架住一部分伤害。三层防御与根缚共用一个蓄力窗口，蓄满后沿锁定方向进行直线重撞。
 * 命中：先把第一个活体沿冲撞方向压出去（原生碰撞决定它实际能走到哪），再看它真实盒面是否贴到墙；
 *       贴墙才追加墙撞：威力 ×slamBonus，并 rooted slamStun 刻撞乱它的节奏，播更重的 slam 表现；
 *       同时从接触到的墙格凿出一个临时缺口（world.terrain 的 linger 租约，换成空气、breachTicks 后
 *       原地形自己放回），别的生物与别的招可以趁这段时间走这条路，世界随后恢复原样。否则普通 impact。
 *       实际伤害写入 presentation 的 data.intensity。
 * 结果：站桩期间是敌人自由输出与绕后的窗口；深蓄更久更远，速收更短更快；凿开的缺口会自己合拢。
 * 反制：蓄力有清楚的预告，可以在启动瞬间离开直线；撞空后还要收招，冲势不会拐弯；别被顶到墙边。
 */
namespace PokemonSkills {
    const skullBashScene = "world_combat:move_skullbash";
    const skullBashBraceText = "world_combat.move.skullbash.text.brace";
    const skullBashHitText = "world_combat.move.skullbash.text.hit";
    const skullBashSlamText = "world_combat.move.skullbash.text.slam";
    const skullBashBreachText = "world_combat.move.skullbash.text.breach";
    const skullBashWhiffText = "world_combat.move.skullbash.text.whiff";
    const skullBashBraceRule = "world_combat:move_skullbash_brace";
    const skullBashBraceKey = "world_combat:move_skullbash:brace";

    function skullBashAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /**
     * 目标此刻是不是被这一撞真正按在墙上：从它真实碰撞箱朝冲撞方向的那一面出发，做一小段原生方块碰撞
     * 射线；身体贴到墙面才算，墙在身后有缝隙（例如免位移、离墙还有一截的 Boss）就不算。
     * 起点取盒面而不是身体中心，体型大的对手不会因为中心离墙远而漏判；背贴墙的目标也照样成立。
     * 射线只看方块（原生 COLLIDER），不看活体，所以不会被目标自己挡住。
     */
    function skullBashWall(world: CombatWorld, body: CombatObservation, direction: CombatPoint, reach: number): CombatImpact | null {
        const min = body.boundsMin(), max = body.boundsMax(), centre = body.position();
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() > 0.01 ? flat.unit() : direction;
        const halfX = (max.x() - min.x()) * 0.5, halfZ = (max.z() - min.z()) * 0.5;
        const lead = Math.abs(heading.x()) * halfX + Math.abs(heading.z()) * halfZ;
        const from = centre.plus(heading.scale(Math.max(0, lead)));
        const probe = Math.max(0.15, Math.min(reach, 0.4));
        return WorldGeometry.blockHit(world, from, from.plus(heading.scale(probe)));
    }

    /**
     * 撞锤把目标身后的墙凿出一个临时缺口：从真实接触到的墙格起，脚、头两层各向内再凿一格，最多
     * slamBlocks 格，每格都交给 world.terrain 的 linger 租约（换成空气、breachTicks 后把原方块放回）。
     * 缺口活过这一撞本身，给别的生物与别的招留出一条能走过去的路，时间一到墙自己长回原样。
     * 带方块实体的方块、液体、火与受保护的方块由宿主拒绝；撞不动就跳过，一处都凿不动时退回普通撞墙表现。
     */
    function skullBashBreach(world: CombatWorld, wall: CombatImpact, direction: CombatPoint, limit: number, ticks: number): number {
        const cell = wall.blockPosition();
        if (cell === null) return 0;
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const step = flat.length() > 0.01 ? flat.unit() : WorldCombat.point(1, 0, 0);
        const up = WorldCombat.point(0, 1, 0), depth = step.scale(1);
        const pattern = [cell, cell.plus(up), cell.plus(depth), cell.plus(depth).plus(up)];
        const life = Math.max(1, Math.min(12000, Math.round(ticks)));
        const seen: { [key: string]: boolean } = Object.create(null);
        let broken = 0;
        for (let i = 0; i < pattern.length && broken < limit; i++) {
            const block = world.block(pattern[i]);
            if (block === null || String(block.id()) === "minecraft:air") continue;
            const at = block.position(), key = at.x() + "," + at.y() + "," + at.z();
            if (seen[key]) continue;
            seen[key] = true;
            try {
                if (world.terrain(JSON.stringify({ cells: [{ x: at.x(), y: at.y(), z: at.z(), block: "minecraft:air" }], replace: true, linger: true }), life) <= 0) continue;
            } catch (error) { continue; }
            broken++;
            WorldFeedback.emit(world, skullBashScene, 1, at.plus(WorldCombat.point(0.5, 0.5, 0.5)), { moment: "crush" }, 22);
        }
        return broken;
    }

    /**
     * 缩头期间的防御层统一挂在 guard 托管效果上：护甲由效果自己施加、随它收束，brace 画面用 onEffect
     * 绑同一条效果，中断或被驱散时一起消失，不留护甲或画面残留。架住伤害的那一刻仍炸开短闪。
     */
    GuardEffects.register(skullBashBraceRule, {
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const custom: any = state;
            if (!custom.armed) {
                custom.armed = true; effect.state(JSON.stringify(custom));
                const armor = Number(custom.armor) || 0;
                if (armor > 0) world.attribute(effect.target(), "minecraft:generic.armor", armor, "add_value");
            }
            WorldFeedback.onEffect(world, effect.id(), skullBashBraceKey, skullBashScene, 1, body.position(),
                { moment: "brace", target: String(effect.target().ref()), charge: custom.charge, deep: custom.deep ? 1 : 0 });
        },
        guarded: function (effect) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            WorldFeedback.emit(world, skullBashScene, 1, body.position(), { moment: "parry", target: String(effect.target().ref()) }, 16);
        }
    });

    define({
        freeMovement: true,
        id: "skullbash", name: "火箭头锤", description: "先缩头蓄力，临时增加护甲、防御与减伤，再沿锁定方向直线撞出：撞上第一个敌人就造成接触伤害并推开它；目标身体真的被压到墙上时这一撞更重，并把它定住、尝试撞开一处临时缺口。没撞到敌人时会撞在墙上停住。",
        uses: ["正面破阵", "以防御换重击", "把对手顶到墙上"], kind: "aim", range: 8, prepare: 0, active: 60, recover: 14, cooldown: 70, style: "charge",
        defaults: { deep: true },
        fields: [field(pathOf("deep"), "深蓄", "boolean", { help: "开启（深蓄）：蓄力窗口更长、护甲与减伤更强、防御再 +1 级、冲得更远，但收招更长；关闭（速收）：蓄力更短、护甲略低、冲得更短，收招更快。两档的撞锤威力相同，差别在站桩的时长与冲程。" })],
        indicator: function (config, pokemon) {
            // 指示线就是这一次真正能冲到的长度（含深蓄/速收与体重的取舍），与冲撞距离同源。
            const context: NumberContext = { pokemon: pokemon!, skill: skills["skullbash"], detail: { values: config } };
            return { radius: p("skullbash", "distance", context), geometry: "line", style: "charge", label: skullBashDeep(config) ? "深蓄冲撞路线" : "速收冲撞路线" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["skullbash"], detail: { values: config }, world: world || null, actor: actor || null };
            const deep = skullBashDeep(config);
            return {
                prepare: p("skullbash", "prepare", context),
                recover: p("skullbash", "recover", context) + (deep ? 6 : -3),
                cooldown: p("skullbash", "cooldown", context),
                active: skills["skullbash"].active, range: skills["skullbash"].range
            };
        },
        windup: function (action, config) {
            action.present("skullbash:tuck", skullBashScene, 1, action.origin(), JSON.stringify({ moment: "tuck", target: String(action.actor().ref()), deep: skullBashDeep(config) ? 1 : 0 }));
            return p("skullbash", "prepare", action);
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(skullBashScene);
            const world = action.world(), self = action.actor();
            const deep = skullBashDeep(config);
            const charge = Math.max(6, Math.round(p("skullbash", "charge", action) * (deep ? 1.35 : 0.7)));
            const armor = p("skullbash", "armorGain", action) * (deep ? 1.3 : 0.8);
            const guard = p("skullbash", "guardStage", action) + (deep ? 1 : 0);
            const block = p("skullbash", "braceBlock", action) * (deep ? 1.1 : 0.85);
            sound(action, "minecraft:block.anvil.land");
            // 三层防御（护甲、架势减伤、防御等级）与根缚共用同一个蓄力窗口，最后 4 刻也照旧站定；
            // 窗口一收，护甲的修饰随 guard 效果一起撤去，冲撞本身是脚本位移、不受减速影响。
            const rootId = WorldEffects.apply(world, self, "rooted", {}, charge);
            const guardId = GuardEffects.apply(world, self, {
                rule: skullBashBraceRule, mode: "pool", capacity: 100000, fraction: Math.min(1, block),
                minimumHealth: 0, charges: 0, linkRange: 0, armor: armor, charge: charge, deep: deep, armed: false
            } as any, charge);
            const boostId = NativeEffects.boostWindow(world, self, { def: guard }, charge, "world_combat:move/skullbash");
            action.on("world_combat:interrupt", function (current: CombatAction) {
                // 中断即收束：根缚、护甲/减伤与防御等级都不留在场上，brace 画面绑在 guard 效果上随它消失。
                try {
                    const scope = current.world();
                    if (rootId > 0) scope.operation(rootId, "world_combat:dispel", "{}");
                    if (guardId > 0) scope.operation(guardId, "world_combat:dispel", "{}");
                    if (boostId > 0) NativeEffects.windowClose(scope, boostId);
                } catch (error) { }
            });
            WorldFeedback.text(world, skullBashAbove(action.origin()), skullBashBraceText, [], 24);
            action.after(charge, function (charging: CombatAction) {
                const cworld = charging.world(), caster = charging.actor(), casterRef = String(caster.ref());
                const launched = cworld.observe(caster), locked = charging.target();
                const lockedBody = locked !== null ? cworld.observe(locked) : null;
                const heading = launched !== null && lockedBody !== null ? lockedBody.position().minus(launched.position()) : null;
                // Lock the line on the foe's live body; fall back to the recorded target point when it is gone.
                const direction = heading !== null && heading.length() > 0.01 ? heading.unit() : aim(charging);
                const length = p("skullbash", "distance", charging);
                const power = p("skullbash", "power", charging), push = p("skullbash", "push", charging);
                const travel = Math.ceil(length / Math.max(0.05, p("skullbash", "speed", charging))) + 8;
                movementScenes.show(charging, "launch", charging.origin(), { moment: "launch", target: casterRef });
                sound(charging, "minecraft:entity.ravager.attack");
                let travelled = 0;
                function advance(current: CombatAction): void {
                    const w = current.world(), self = w.observe(caster);
                    if (self === null) { movementScenes.finish(current, done); return; }
                    const origin = self.position();
                    const step = Math.min(p("skullbash", "speed", current), Math.max(0, length - travelled));
                    const delta = direction.scale(step);
                    const swept = sweepStep(current, delta, p("skullbash", "collisionRadius", current));
                    const hit = swept.hit;
                    if (hit.hitEntity()) {
                        const target = hit.target();
                        if (target !== null && !current.sense().friendly(target)) {
                            const body = w.observe(target);
                            if (body) {
                                // 先把目标沿冲撞方向压出去：原生碰撞决定它实际能走到哪，贴墙或免疫位移的目标位移为 0。
                                if (w.valid(target)) w.hitDisplace(target, direction.scale(push));
                                const stopped = w.observe(target);
                                const at = stopped !== null ? stopped.position() : body.position();
                                // 再看它真实的盒面是否压到墙：贴墙才算，别按中心预判。
                                const wall = stopped !== null ? skullBashWall(w, stopped, direction, p("skullbash", "slamReach", current)) : null;
                                const pinned = wall !== null;
                                const before = body.health();
                                const blow = power * (pinned ? p("skullbash", "slamBonus", current) : 1);
                                const landed = impact(current, hit, move.id(), blow, { contact: true }, "skullbash");
                                const after = w.observe(target), dealt = Math.max(0, before - (after ? after.health() : before));
                                if (landed) {
                                    WorldFeedback.emit(w, skullBashScene, 1, at, { moment: pinned ? "slam" : "impact", target: String(target.ref()), intensity: 1 + Math.min(1, dealt / Math.max(1, body.maxHealth())) * 4 }, pinned ? 46 : 40);
                                    if (pinned && wall !== null) {
                                        if (w.valid(target)) WorldEffects.apply(w, target, "rooted", {}, p("skullbash", "slamStun", current));
                                        const broke = skullBashBreach(w, wall, direction, Math.max(1, Math.round(p("skullbash", "slamBlocks", current))), p("skullbash", "breachTicks", current));
                                        WorldFeedback.text(w, skullBashAbove(at), broke > 0 ? skullBashBreachText : skullBashSlamText, [], 32);
                                        sound(current, "minecraft:entity.iron_golem.attack");
                                    } else {
                                        WorldFeedback.text(w, skullBashAbove(at), skullBashHitText, [], 30);
                                        sound(current, "minecraft:entity.iron_golem.attack");
                                    }
                                }
                            }
                        }
                        movementScenes.finish(current, done); return;
                    }
                    const moved = swept.moved;
                    travelled += moved;
                    // 空放撞墙：在真正撞到的接触点停住并留一处墙尘，落点就是撞点。
                    if (hit.blocked()) {
                        const at = hit.position();
                        WorldFeedback.emit(w, skullBashScene, 1, at, { moment: "crash", target: casterRef, face: hit.blockFace() }, 22);
                        WorldFeedback.text(w, skullBashAbove(at), skullBashWhiffText, [], 26);
                        movementScenes.finish(current, done); return;
                    }
                    if (moved < p("skullbash", "minimumMove", current) || travelled >= length) {
                        WorldFeedback.emit(w, skullBashScene, 1, current.origin(), { moment: "skid", target: casterRef }, 20);
                        WorldFeedback.text(w, skullBashAbove(current.origin()), skullBashWhiffText, [], 26);
                        movementScenes.finish(current, done); return;
                    }
                    current.after(1, advance);
                }
                advance(charging);
            });
        }
    });
}
