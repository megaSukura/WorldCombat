/** fissure: a real connected ground route to a locked foot point and a finite world-HP budget, not an instant kill. */
namespace PokemonSkills {
    export const fissureId = "fissure";
    export const fissureScene = "world_combat:move_fissure";
    export const fissureBreakText = "world_combat.move.fissure.text.break";
    export const fissureMissText = "world_combat.move.fissure.text.miss";
    export const fissureAirText = "world_combat.move.fissure.text.air";
    export const fissureBlockedText = "world_combat.move.fissure.text.resisted";
    /** 表现里落点的参考半径（格）；服务端传 scale = 实际落点半径 / 这个值。 */
    export const fissureReference = 1.7;

    /**
     * 一段沿真实支撑的连接：从施法者脚面沿连续顶面走到落点脚面，抬升/落步各限 1 格，
     * 断口、高墙或另一楼层立即结束；只有真的连到落点才返回这条真实顶点。判定与表现共用。
     */
    export function fissureLink(world: CombatWorld, start: CombatPoint, landing: CombatPoint, reach: number): CombatPoint[] | null {
        const dx = landing.x() - start.x(), dz = landing.z() - start.z();
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (!(distance <= Math.max(1, reach) + 0.5)) return null;
        if (distance < 0.5) return [start, landing];
        const walked = SurfacePaths.advance(world, start, WorldCombat.point(dx, 0, dz), distance,
            { up: 1, down: 1, spacing: 0.5, samples: Math.ceil(distance / 0.5) + 2 });
        if (walked.ended || Math.abs(walked.point.y() - landing.y()) > 1.05) return null;
        return walked.path;
    }

    /** 从真实脚面到真实落点脚面的连续路线；没有支撑、连不到或超出射程返回 null。 */
    export function fissureRoute(world: CombatWorld, casterFeet: CombatPoint, targetFeet: CombatPoint, reach: number): { start: CombatPoint; landing: CombatPoint; path: CombatPoint[] } | null {
        const start = SurfacePaths.support(world, casterFeet, 0.75, 2.5);
        const landing = SurfacePaths.support(world, targetFeet, 1.0, 1.5);
        if (start === null || landing === null) return null;
        const path = fissureLink(world, start, landing, reach);
        return path === null ? null : { start: start, landing: landing, path: path };
    }

    /**
     * 落点结算：只对被锁在落点、贴地的那一个受体结算一笔施术者预算内的世界生命伤害。
     * 地面打不到飞行由属性免疫挡住；被原生减伤／护盾完全挡下返回 "blocked"。不再是必杀。
     */
    export function fissureExecute(action: CombatAction, target: CombatActor, amount: number): "hit" | "blocked" | "miss" | "source-left" {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return "miss";
        const body = world.observe(target);
        if (body === null || body.health() <= 0) return "miss";
        const nativeSource = world.nativeEntity(action.actor());
        const receipt = PokemonDamage.fixedReceipt(world, target, CobblemonCombat.moveTemplate(fissureId), amount,
            { contact: false, knockback: false, bypassCooldown: true, ignoreArmor: true }, "immunity", action);
        if (!nativeSource || !nativeSource.isAlive() || nativeSource.isRemoved()) return "source-left";
        return receipt.actual > 0 ? "hit" : "blocked";
    }

    actionParameters.define(fissureId, {
        /** 射程：7.0 + 等级(≥20)偏移[0,2.0] + 速度偏移[−0.6,1.2]；夹 5..11。 */
        reach: formula(
            F.base(7.0).plus(F.level().minus(20).times(0.05).clamp(0, 2.0))
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.6, 1.2)).clamp(5, 11).round(2),
            "射程", {
                unit: "格",
                description: "裂缝沿真实地面能窜多远；等级高、腿快的个体把震荡送得更远。它也是本招的实际射程，且要求两者脚下有连续的真实地面相连。"
            }),
        /** 落点半径：1.7 + 体重偏移[−0.25,0.75] + 物攻偏移[−0.2,0.5]；深裂 ×1.25；夹 1.2..3.0。 */
        sink: formula(
            F.base(1.7).plus(F.body("weight").minus(60).times(0.0018).clamp(-0.25, 0.75))
                .plus(F.stat("attack").minus(55).times(0.006).clamp(-0.2, 0.5))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(1.25), F.const(1)))
                .clamp(1.2, 3.0).round(2),
            "落点半径", {
                unit: "格",
                description: "落点裂口有多大；越沉、物攻越高的人砸裂的地面越宽，深裂式再放大一圈。圈里只结算最近那一个贴地受体。"
            }),
        /** 张口延迟：26 −（等级 − 目标等级）×0.6（夹 [−8,16]）+ 深裂 8；夹 12..42。 */
        mark: seconds(
            F.base(26).minus(F.level().minus(F.target("level", text("worldcombat.skill.fissure.value.targetLevel"))).times(0.6).clamp(-8, 16))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(8), F.const(0)))
                .clamp(12, 42).round(0),
            "张口延迟", "裂缝沿地面窜到落点、真正张口前的那段预告；等级压过对手时张口更快，对手能走开的时间更短。对手等级在施放时读取。"),
        /** 地裂伤害：30 + 0.35×物攻 + 0.4×等级 + 0.05×clamp(体重,0,100)；夹 30..170 世界生命。 */
        tremor: formula(
            F.const(30).plus(F.stat("attack").times(0.35)).plus(F.level().times(0.4))
                .plus(F.body("weight").clamp(0, 1000).times(0.05)).clamp(30, 170).round(0),
            "地裂伤害", {
                unit: "点",
                description: "裂缝在落点结算的一笔固定世界生命伤害：由施术者的物攻、等级与体重决定，不按目标生命或防御缩放；属性免疫与原生减伤仍生效。"
            }),
        /** 碎屑量：20 + 物攻偏移[−4,30]；夹 16..64。 */
        spall: formula(
            F.base(20).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 30)).clamp(16, 64).round(0),
            "碎屑量", {
                unit: "个",
                description: "地面崩开时溅出的碎屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 裂纹停留：50 + 等级(≥30)偏移[−10,40]；深裂 ×1.35；夹 30..120。 */
        rentTicks: seconds(
            F.base(50).plus(F.level().minus(30).times(0.6).clamp(-10, 40))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(1.35), F.const(1)))
                .clamp(30, 120).round(0),
            "裂纹停留", "地上那道短裂纹留多久才散去；它只是余痕，不替换方块、不封路、不造成伤害，深裂式留得稍久。"),
        /** 起手：16 − 速度偏移[−2,3]；夹 10..24。 */
        tempo: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(10, 24).round(0),
            "起手", "蹲身砸地、把震荡压进土里需要多久；速度越快起得越短。"),
        /** 收招：10 − 速度偏移[−2,2]；夹 6..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(6, 16).round(0),
            "收招", "砸完直起身、理顺地面的收势。"),
        /** 冷却：96 − 等级(≥20)偏移[0,18]；深裂 +10；夹 60..130。 */
        recharge: seconds(
            F.base(96).minus(F.level().minus(20).times(0.3).clamp(0, 18))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(10), F.const(0)))
                .clamp(60, 130).round(0),
            "冷却", "两次砸地之间的等待；等级越高回得越快，深裂式缓得更久。")
    });

    stages(fissureId, [
        { level: 35, values: { sink: 2.0 } },
        { level: 50, values: { sink: 2.3, reach: 8.4, rentTicks: 90 } }
    ]);

    describe(fissureId, [
        { key: "description.0", values: ["reach", "sink", "tremor"] },
        { key: "description.ground", values: [] },
        { key: "description.1", values: ["mark"] },
        { key: "description.2", values: ["rentTicks"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sink"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sink", "tier.1.reach", "tier.1.rentTicks"] }
    ]);
}
