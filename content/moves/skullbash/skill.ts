/**
 * 火箭头锤 / Skull Bash — 执行组织。
 *
 * 念头：缩头护住要害，把护住的头当撞锤——蓄力越久，撞得越重越远，站桩也越久。
 *
 * 出手：提交后立刻缩头蹲桩；给自身挂 rooted（不能移动）、加原版护甲、提升原生防御，并用共用的
 *       GuardEffects 架住一部分伤害。蓄力刻数走完后沿锁定方向进行直线重撞。
 * 命中：第一个活体结算一次共享接触伤害（power 段）。若目标背后 1.6 格内被墙/方块堵住，就把它
 *       钉在墙上：威力 ×slamBonus，并 rooted slamStun 刻撞乱它的节奏，播更重的 slam 表现；
 *       同时把背后的方块凿成一个临时缺口（world.terrain 的 linger 租约，换成空气、breachTicks 后
 *       原地形自己放回），别的生物与别的招可以趁这段时间走这条路，世界随后恢复原样。否则普通 impact，
 *       沿冲撞方向推开。实际伤害写入 presentation 的 data.intensity。
 * 结果：站桩期间是敌人自由输出与绕后的窗口；深蓄更长更远，速收更短更弱；凿开的缺口会自己合拢。
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

    function skullBashAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /**
     * 撞锤把目标身后的墙凿出一个临时缺口：在背后脚、头两层，各向内再凿一格，最多 slamBlocks 格，
     * 每格都交给 world.terrain 的 linger 租约（换成空气、breachTicks 后把原方块放回）。
     * 缺口活过这一撞本身，给别的生物与别的招留出一条能走过去的路，时间一到墙自己长回原样。
     * 带方块实体的方块、液体、火与受保护的方块由宿主拒绝；撞不动就跳过，一处都凿不动时退回普通撞墙表现。
     */
    function skullBashBreach(world: CombatWorld, from: CombatPoint, direction: CombatPoint, limit: number, ticks: number): number {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const step = flat.length() > 0.01 ? flat.unit() : WorldCombat.point(1, 0, 0);
        const up = WorldCombat.point(0, 1, 0), depth = step.scale(1), at = from.plus(step.scale(0.9));
        const pattern = [at, at.plus(up), at.plus(depth), at.plus(depth).plus(up)];
        const life = Math.max(1, Math.min(12000, Math.round(ticks)));
        const seen: { [key: string]: boolean } = Object.create(null);
        let broken = 0;
        for (let i = 0; i < pattern.length && broken < limit; i++) {
            const block = world.block(pattern[i]);
            if (block === null || String(block.id()) === "minecraft:air") continue;
            const cell = block.position(), key = cell.x() + "," + cell.y() + "," + cell.z();
            if (seen[key]) continue;
            seen[key] = true;
            try {
                if (world.terrain(JSON.stringify({ cells: [{ x: cell.x(), y: cell.y(), z: cell.z(), block: "minecraft:air" }], replace: true, linger: true }), life) <= 0) continue;
            } catch (error) { continue; }
            broken++;
            WorldFeedback.emit(world, skullBashScene, 1, cell.plus(WorldCombat.point(0.5, 0.5, 0.5)), { moment: "crush" }, 22);
        }
        return broken;
    }

    /** 缩头架住伤害的那一刻在自身身上炸开短闪，让“护住了”在画面里读得出来。 */
    GuardEffects.register(skullBashBraceRule, {
        guarded: function (effect) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            WorldFeedback.emit(world, skullBashScene, 1, body.position(), { moment: "parry", target: String(effect.target().ref()) }, 16);
        }
    });

    define({
        id: "skullbash", name: "火箭头锤", description: "缩头蹲桩提升护甲、防御并架住伤害，站定蓄力后沿直线猛撞第一个敌人，把它连同自己一起甩出去；若把它顶到墙上会更重、撞乱它的节奏，并在墙上凿出一个能走过去的临时缺口，缺口几秒后自行合拢。蓄力期间不能移动，方向也不会拐弯。",
        uses: ["正面破阵", "以防御换重击", "把对手顶到墙上"], kind: "enemy", range: 8, prepare: 0, active: 60, recover: 14, cooldown: 70, style: "charge",
        defaults: { deep: true },
        fields: [field(pathOf("deep"), "深蓄", "boolean", { help: "开启（深蓄）：蓄力更长、护甲与减伤更强、防御再 +1 级、冲得更远，但收招更长；关闭（速收）：蓄力更短、护甲略低、收招更快，但撞得更弱更短。" })],
        indicator: function (config) {
            return { radius: 1, geometry: "line", style: "charge", label: skullBashDeep(config) ? "深蓄冲撞路线" : "速收冲撞路线" };
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
            const world = action.world(), self = action.actor();
            const deep = skullBashDeep(config);
            const charge = Math.max(6, Math.round(p("skullbash", "charge", action) * (deep ? 1.35 : 0.7)));
            const armor = p("skullbash", "armorGain", action) * (deep ? 1.3 : 0.8);
            const guard = p("skullbash", "guardStage", action) + (deep ? 1 : 0);
            const block = p("skullbash", "braceBlock", action) * (deep ? 1.1 : 0.85);
            sound(action, "minecraft:block.anvil.land");
            WorldEffects.apply(world, self, "rooted", {}, charge + 8);
            world.attribute(self, "minecraft:generic.armor", armor, "add_value");
            GuardEffects.apply(world, self, {
                rule: skullBashBraceRule, mode: "pool", capacity: 100000, fraction: Math.min(1, block),
                minimumHealth: 0, charges: 0, linkRange: 0
            }, charge + 8);
            NativeEffects.boostWindow(world, self, { def: guard }, charge + 8, "world_combat:move/skullbash");
            WorldFeedback.emit(world, skullBashScene, 1, action.origin(), { moment: "brace", target: String(self.ref()), charge: charge }, charge + 12);
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
                WorldFeedback.emit(cworld, skullBashScene, 1, charging.origin(), { moment: "launch", target: casterRef }, travel);
                sound(charging, "minecraft:entity.ravager.attack");
                let travelled = 0;
                function advance(current: CombatAction): void {
                    const w = current.world(), self = w.observe(caster);
                    if (self === null) { done(current); return; }
                    const origin = self.position();
                    const step = Math.min(p("skullbash", "speed", current), Math.max(0, length - travelled));
                    const delta = direction.scale(step);
                    const hit = current.trace(origin, origin.plus(delta.scale(p("skullbash", "traceAhead", current))), p("skullbash", "collisionRadius", current));
                    if (hit.hitEntity()) {
                        const target = hit.target();
                        if (target !== null && !current.sense().friendly(target)) {
                            const body = w.observe(target);
                            if (body) {
                                const before = body.health();
                                // A wall right behind the victim is the move's extra material: pinned foes take more and lose their rhythm.
                                const behind = body.position().plus(direction.scale(p("skullbash", "slamReach", current)));
                                const pinned = !w.clear(body.position(), behind);
                                const blow = power * (pinned ? p("skullbash", "slamBonus", current) : 1);
                                const landed = impact(current, hit, move.id(), blow, { contact: true }, "skullbash");
                                const after = w.observe(target), dealt = Math.max(0, before - (after ? after.health() : before));
                                if (landed) {
                                    if (w.valid(target)) w.displace(target, direction.scale(push));
                                    WorldFeedback.emit(w, skullBashScene, 1, body.position(), { moment: pinned ? "slam" : "impact", target: String(target.ref()), intensity: 1 + Math.min(1, dealt / Math.max(1, body.maxHealth())) * 4 }, pinned ? 46 : 40);
                                    if (pinned) {
                                        if (w.valid(target)) WorldEffects.apply(w, target, "rooted", {}, p("skullbash", "slamStun", current));
                                        const broke = skullBashBreach(w, body.position(), direction, Math.max(1, Math.round(p("skullbash", "slamBlocks", current))), p("skullbash", "breachTicks", current));
                                        WorldFeedback.text(w, skullBashAbove(body.position()), broke > 0 ? skullBashBreachText : skullBashSlamText, [], 32);
                                        sound(current, "minecraft:entity.iron_golem.attack");
                                    } else {
                                        WorldFeedback.text(w, skullBashAbove(body.position()), skullBashHitText, [], 30);
                                        sound(current, "minecraft:entity.iron_golem.attack");
                                    }
                                }
                            }
                        }
                        done(current); return;
                    }
                    const moved = w.displace(caster, delta);
                    travelled += moved;
                    if (moved < p("skullbash", "minimumMove", current) || travelled >= length) {
                        WorldFeedback.emit(w, skullBashScene, 1, origin.plus(delta), { moment: "skid", target: casterRef }, 20);
                        WorldFeedback.text(w, skullBashAbove(origin), skullBashWhiffText, [], 26);
                        done(current); return;
                    }
                    current.after(1, advance);
                }
                advance(charging);
            });
        }
    });
}
