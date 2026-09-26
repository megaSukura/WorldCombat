/** fissure: one native execution attempt; native damage events and immunity determine its result. */
namespace PokemonSkills {
    export const fissureResisted = "world_combat:fissure_resisted";
    WorldCombat.effect(fissureResisted, 1, 400, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(fissureResisted, "start", function () { });

    export const fissureId = "fissure";
    export const fissureScene = "world_combat:move_fissure";
    export const fissureBreakText = "world_combat.move.fissure.text.break";
    export const fissureMissText = "world_combat.move.fissure.text.miss";
    export const fissureAirText = "world_combat.move.fissure.text.air";
    /** 表现里落点的参考半径（格）；服务端传 scale = 实际落点半径 / 这个值。 */
    export const fissureReference = 1.7;

    /** 被掀开的地表形态：泥土翻粗土、石头崩碎石、沙地翻砂岩。 */
    function fissureTorn(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id.indexOf("deepslate") >= 0) return "minecraft:cobbled_deepslate";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:gravel") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 从两列地表之间撕开一条裂缝：沿「脚下→目标点」的线找自然地表，再沿落点外缘补一圈；到期原方块回来。 */
    export function fissureRent(world: CombatWorld, from: CombatPoint, to: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null), limit = Math.max(12, Math.round(cap));

        function surface(x: number, z: number, baseY: number): void {
            if (cells.length >= limit) return;
            for (let dy = 1; dy >= -3; dy--) {
                const block = world.block(WorldCombat.point(x, baseY + dy, z));
                if (block === null) return;
                const id = String(block.id());
                if (id.indexOf("air") >= 0) continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id.indexOf("water") >= 0 || id.indexOf("lava") >= 0) return;
                const key = x + "," + (baseY + dy) + "," + z;
                if (!seen[key]) {
                    const broken = fissureTorn(id);
                    if (broken !== "" && broken !== id) { seen[key] = true; cells.push({ x: x, y: baseY + dy, z: z, block: broken }); }
                }
                return;
            }
        }

        const path = WorldGeometry.along(from, to, 1.0);
        for (let i = 0; i < path.length && cells.length < limit; i++)
            surface(Math.floor(path[i].x()), Math.floor(path[i].z()), Math.floor(path[i].y()));
        const rim = Math.max(8, Math.round(radius * 3));
        for (let i = 0; i < rim && cells.length < limit; i++) {
            const angle = i * (Math.PI * 2 / rim);
            surface(Math.floor(to.x() + Math.cos(angle) * radius), Math.floor(to.z() + Math.sin(angle) * radius), Math.floor(to.y()));
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    /**
     * 处决：把目标剩下的生命一次结清。属性免疫（地面打不到飞行）返回 "immune"；打不动返回 "miss"。
     * 目标防御、护甲与韧性不参与——这是「一击濒死」，原生伤害事件决定本次是否生效。
     */
    export function fissureExecute(action: CombatAction, target: CombatActor): "kill" | "immune" | "miss" | "resisted" {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target)) return "miss";
        const body = world.observe(target);
        if (body === null || body.health() <= 0) return "miss";
        const move = CobblemonCombat.moveTemplate(fissureId), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: fissureId, type: type }));
                return "immune";
            }
        const metadata: any = { kind: "move", move: fissureId, type: type, category: String(move.category()),
            contact: false, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        if (armor !== null) metadata.armorExcluded = armor.value();
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        const accepted = world.hurt(target, body.health() + body.maxHealth(), JSON.stringify(metadata));
        const after = world.observe(target);
        if (accepted && (after === null || after.health() <= 0)) return "kill";
        world.effect(fissureResisted, target, "{}", 400);
        return "resisted";
    }

    actionParameters.define(fissureId, {
        /** 射程：7.0 + 等级(≥20)偏移[0,2.0] + 速度偏移[−0.6,1.2]；夹 5..11。 */
        reach: formula(
            F.base(7.0).plus(F.level().minus(20).times(0.05).clamp(0, 2.0))
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.6, 1.2)).clamp(5, 11).round(2),
            "射程", {
                unit: "格",
                description: "裂缝沿地表能窜多远；等级高、腿快的个体把震荡送得更远。它也是本招的实际射程，且需要一条没有被挡住的视线。"
            }),
        /** 落点半径：1.7 + 体重偏移[−0.25,0.75] + 物攻偏移[−0.2,0.5]；深裂 ×1.25；夹 1.2..3.0。 */
        sink: formula(
            F.base(1.7).plus(F.body("weight").minus(60).times(0.0018).clamp(-0.25, 0.75))
                .plus(F.stat("attack").minus(55).times(0.006).clamp(-0.2, 0.5))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(1.25), F.const(1)))
                .clamp(1.2, 3.0).round(2),
            "落点半径", {
                unit: "格",
                description: "目标脚下张开的坑有多大；越沉、物攻越高的人砸裂的地面越宽，深裂式再放大一圈。"
            }),
        /** 张口延迟：26 −（等级 − 目标等级）×0.6（夹 [−8,16]）+ 深裂 8；夹 12..42。 */
        mark: seconds(
            F.base(26).minus(F.level().minus(F.target("level", text("worldcombat.skill.fissure.value.targetLevel"))).times(0.6).clamp(-8, 16))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(8), F.const(0)))
                .clamp(12, 42).round(0),
            "张口延迟", "裂缝窜到目标脚下、真正张口前的那段预告；等级压过对手时张口更快，对手能走开的时间更短。对手等级在施放时读取。"),
        /** 碎屑量：20 + 物攻偏移[−4,30]；夹 16..64。 */
        spall: formula(
            F.base(20).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 30)).clamp(16, 64).round(0),
            "碎屑量", {
                unit: "个",
                description: "地面崩开时溅出的碎屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 裂缝停留：150 + 等级(≥30)偏移[−20,90]；深裂 ×1.35；夹 100..300。 */
        rentTicks: seconds(
            F.base(150).plus(F.level().minus(30).times(1.2).clamp(-20, 90))
                .times(F.when(F.pref("deep", text("worldcombat.skill.fissure.preference.deep")), F.const(1.35), F.const(1)))
                .clamp(100, 300).round(0),
            "裂缝停留", "地上那道裂缝留多久才恢复原样；等级越高、深裂式留得越久。"),
        /** 裂缝块数：22 + 体重偏移[−4,12] + 物攻偏移[−4,18]；夹 16..56。 */
        rentCells: formula(
            F.base(22).plus(F.body("weight").minus(60).times(0.15).clamp(-4, 12))
                .plus(F.stat("attack").minus(55).times(0.2).clamp(-4, 18)).clamp(16, 56).round(0),
            "裂缝块数", {
                unit: "块",
                description: "裂缝沿途与落点被掀开的地块数；随体重与物攻增长，也决定画面里的裂块密度。"
            }),
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
        { level: 50, values: { sink: 2.3, reach: 8.4, rentTicks: 200 } }
    ]);

    describe(fissureId, [
        { key: "description.0", values: ["reach","sink"] },
        { key: "description.ground", values: [] },
        { key: "description.1", values: ["mark"] },
        { key: "description.2", values: ["rentTicks","rentCells"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sink"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sink", "tier.1.reach", "tier.1.rentTicks"] }
    ]);
}
