/**
 * 绝对零度 / sheercold —— 参数与处决结算。
 *
 * 原生事实：Ice／特殊／威力 0／命中 30／PP 5／单体／ohko: "Ice"——只要命中就一击濒死，
 *   且「冰属性以外的宝可梦使用会难以打中」；30% 命中由双方等级差修正（Cobblemon 1.8，15 位已实装学习者）。
 *
 * 翻译：把「给对手一击濒死」落成一片**锁定在目标周围、向四周骤然结霜的圆**——施法者把那一小片空气
 *   降到绝对零度，圈内每个目标被一次冻毙。它是四记一击必杀里唯一**同时作用于一块半径**的一记，
 *   也是唯一「谁用」会影响命中难度的一记：冰属性使用者结霜更快（窗口更短），非冰属性使用者慢半拍。
 *   冰属性的目标本身不受影响（原生 ohko: "Ice"）。
 *
 * 与同族分开（四记都靠「预告形状」被认出）：
 *   地裂     —— 远程、坑在目标脚下的地面，只有站在地上的人中招，事后留裂缝；
 *   角钻     —— 施法者沿一条**直线**钻过去，会位移、会撞墙；
 *   断头钳   —— 贴身的**扇形**钳合，最短最快、收招最久；
 *   绝对零度 —— 目标周围一整圈**半径**冻杀，唯一能同时放倒多个，且冰属性使用者命中更快。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   radius     冻结半径 2.6 + 特攻偏移 + 等级(≥20)偏移；特攻越高、等级高的人冻得越大，也是实际射程。
 *   mark       结霜延迟 26 −（等级差）×0.6，再乘冰属性系数（冰 0.62 / 非冰 1）；冰属性使用者出手快得多。
 *   hush       寒雾量 22 + 特攻偏移；驱动表现密度。
 *   frostTicks 寒霜停留 120 + 等级偏移；冰河式 ×1.3。
 *   frostCells 寒霜块数 18 + 特攻偏移；同时是画面里的霜块数。
 *   tempo／aftercast／recharge 速度与等级定起手、收招、冷却。
 *
 * 事实接入：使用者是否冰属性是自定义纯事实 `self.ice`（defineFacts），供 `mark` 公式与悬浮共用。
 *
 * 配置 `glacial`（冰河式）双向取舍：开＝冻结半径 ×1.2、寒霜更久（×1.3），代价是结霜延迟 +7 刻、冷却 +10
 *   （圈更大、霜更持久，代价是预告更慢）；关（急冻式）＝结霜更快、冷却更短，但圈更小、霜更短。
 */
namespace PokemonSkills {
    export const sheercoldId = "sheercold";
    export const sheercoldScene = "world_combat:move_sheercold";
    export const sheercoldKillText = "world_combat.move.sheercold.text.kill";
    export const sheercoldMissText = "world_combat.move.sheercold.text.miss";
    export const sheercoldIceText = "world_combat.move.sheercold.text.immune";
    /** 表现里冻结圈的参考半径（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const sheercoldReference = 2.6;

    /** 使用者是否冰属性：自定义纯事实 self.ice，供 mark 公式与悬浮共用。 */
    defineFacts(sheercoldId, function (context: FactContext): Formula.Facts {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return { read: function () { return undefined; } };
        const ice = PokemonDamage.combatants.read(world, actor).types.indexOf("ice") >= 0;
        return { read: function (id: string) { return id === "self.ice" ? (ice ? 1 : 0) : undefined; } };
    });

    /** 被冻住的地表形态：自然地表一律覆一层雪壳，到期原方块回来。 */
    function sheercoldFrozen(id: string): string {
        if (id.indexOf("air") >= 0 || id.indexOf("water") >= 0 || id.indexOf("lava") >= 0) return "";
        if (id === "minecraft:bedrock" || id === "minecraft:barrier") return "";
        if (id === "minecraft:snow_block" || id === "minecraft:packed_ice" || id === "minecraft:blue_ice") return "";
        return "minecraft:snow_block";
    }

    /** 在冻结圈内覆一层雪壳：只动地表，租约到期原方块回来，不掉落、不挖空。 */
    export function sheercoldFrost(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null), limit = Math.max(12, Math.round(cap));
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        const reach = Math.max(1, Math.ceil(radius));

        function column(x: number, z: number): void {
            if (cells.length >= limit) return;
            for (let dy = 1; dy >= -3; dy--) {
                const block = world.block(WorldCombat.point(x, baseY + dy, z));
                if (block === null) return;
                const id = String(block.id());
                if (id.indexOf("air") >= 0) continue;
                const key = x + "," + (baseY + dy) + "," + z;
                if (!seen[key]) {
                    const frozen = sheercoldFrozen(id);
                    if (frozen !== "") { seen[key] = true; cells.push({ x: x, y: baseY + dy, z: z, block: frozen }); }
                }
                return;
            }
        }

        const offsets: number[][] = [];
        for (let dx = -reach; dx <= reach; dx++)
            for (let dz = -reach; dz <= reach; dz++)
                if (dx * dx + dz * dz <= radius * radius) offsets.push([dx, dz]);
        offsets.sort(function (a, b) { return (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]); });
        for (let index = 0; index < offsets.length && cells.length < limit; index++)
            column(baseX + offsets[index][0], baseZ + offsets[index][1]);
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    /**
     * 处决：把目标剩下的生命一次冻毙。冰属性目标免疫（原生 ohko: "Ice"）返回 "immune"。
     * 目标防御、护甲与韧性不参与——只有属性关系能挡。
     */
    export function sheercoldExecute(action: CombatAction, target: CombatActor): "kill" | "immune" | "miss" {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target)) return "miss";
        const body = world.observe(target);
        if (body === null || body.health() <= 0) return "miss";
        const move = CobblemonCombat.moveTemplate(sheercoldId), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (facts.types[index] === "ice" || CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: sheercoldId, type: type }));
                return "immune";
            }
        const metadata: any = { kind: "move", move: sheercoldId, type: type, category: String(move.category()),
            contact: false, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        if (armor !== null) metadata.armorExcluded = armor.value();
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        world.hurt(target, body.health() + body.maxHealth(), JSON.stringify(metadata));
        const after = world.observe(target);
        if (after !== null && after.health() > 0) world.health(target, -after.health(), "world_combat:sheercold_execute");
        return "kill";
    }

    actionParameters.define(sheercoldId, {
        /** 冻结半径：2.6 + 特攻偏移[−0.5,1.5] + 等级(≥20)偏移[0,1.0]；冰河 ×1.2；夹 2.0..5.0。 */
        radius: formula(
            F.base(2.6).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.5))
                .plus(F.level().minus(20).times(0.025).clamp(0, 1.0))
                .times(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(1.2), F.const(1)))
                .clamp(2.0, 5.0).round(2),
            "冻结半径", {
                unit: "格",
                description: "结霜向四周铺开多大一圈，也是本招的实际射程；特攻越高、等级高的人冻得越大，冰河式再放大一档。圈内每个目标都会被冻毙。"
            }),
        /** 结霜延迟：26 −（等级 − 目标等级）×0.6（夹 [−8,16]），再乘冰属性系数（冰 0.62 / 非冰 1），+ 冰河 7；夹 10..42。 */
        mark: seconds(
            F.base(26).minus(F.level().minus(F.target("level", text("worldcombat.skill.sheercold.value.targetLevel"))).times(0.6).clamp(-8, 16))
                .times(F.when(F.var("self.ice", text("worldcombat.skill.sheercold.value.iceUser")), F.const(0.62), F.const(1)))
                .plus(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(7), F.const(0)))
                .clamp(10, 42).round(0),
            "结霜延迟", "锁定圆点到真正结霜之间那段预告；冰属性使用者出手快得多，等级每压过对手 1 级也缩短一点，圈内的目标得在这段时间里走出去。对手等级在施放时读取。"),
        /** 寒雾量：22 + 特攻偏移[−5,34]；夹 18..60。 */
        hush: formula(
            F.base(22).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-5, 34)).clamp(18, 60).round(0),
            "寒雾量", {
                unit: "个",
                description: "结霜一刻翻涌出的寒雾数量，由特攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 寒霜停留：120 + 等级(≥30)偏移[−20,80]；冰河 ×1.3；夹 80..240。 */
        frostTicks: seconds(
            F.base(120).plus(F.level().minus(30).times(1.0).clamp(-20, 80))
                .times(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(1.3), F.const(1)))
                .clamp(80, 240).round(0),
            "寒霜停留", "地面被冻住的那层霜留多久才恢复原样；等级越高、冰河式留得越久。"),
        /** 寒霜块数：18 + 特攻偏移[−3,22]；夹 16..44。 */
        frostCells: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-3, 22)).clamp(16, 44).round(0),
            "寒霜块数", {
                unit: "块",
                description: "冻结圈内被覆霜的地块数；随特攻增长，也决定画面里的霜块密度。"
            }),
        /** 起手：16 − 速度偏移[−2,3]；夹 10..22。 */
        tempo: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(10, 22).round(0),
            "起手", "把那一小片空气压低到冰点需要多久；速度越快起得越短。"),
        /** 收招：12 − 速度偏移[−2,2]；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2)).clamp(7, 18).round(0),
            "收招", "寒气散开、身体回温的收势。"),
        /** 冷却：95 − 等级(≥20)偏移[0,20]；冰河 +10；夹 65..130。 */
        recharge: seconds(
            F.base(95).minus(F.level().minus(20).times(0.33).clamp(0, 20))
                .plus(F.when(F.pref("glacial", text("worldcombat.skill.sheercold.preference.glacial")), F.const(10), F.const(0)))
                .clamp(65, 130).round(0),
            "冷却", "两次结霜之间的等待；等级越高回得越快，冰河式缓得更久。")
    });

    stages(sheercoldId, [
        { level: 40, values: { radius: 3.0 } },
        { level: 55, values: { radius: 3.4, frostTicks: 160 } }
    ]);

    describe(sheercoldId, [
        { key: "description.0", values: ["radius"] },
        { key: "description.1", values: ["mark"] },
        { key: "description.2", values: ["frostTicks", "frostCells"] },
        { key: "glacial.on", values: [], when: function (context) { return read(context.detail.values, ["glacial"]) === true; } },
        { key: "glacial.off", values: [], when: function (context) { return read(context.detail.values, ["glacial"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.radius", "tier.1.frostTicks"] }
    ]);
}
