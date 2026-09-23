/**
 * 金属爆炸 / metalburst 的出手方式。
 *
 * 核心念头：金属外壳把挨过的打击震成应力存着（不分物理特殊），出招时从体内向外炸开，
 * 把那份应力以 1.5 倍炸在对手身上，迸裂的碎片再削到周围的敌人。
 *
 * 两幕：
 *   起（windup，提交前）：外壳泛起应力纹、火星沿体表乱窜；账越大纹路越密（present brace）。
 *   爆（execute）：以自身为中心炸开，账主吃满额、范围内的其他敌人按分摊比例各吃一份；
 *       没有账可讨时外壳只空响一声（whiff）。
 *
 * 与同族分开：金属爆炸是自身为中心的范围爆破、即时落地、钢属性；复仇是隔空追债的一记暗影。
 */
namespace PokemonSkills {
    define({
        id: metalburstId,
        cooldownParameter: "recharge",
        name: "Metal Burst",
        description: "把最近一次挨到的伤害以 1.5 倍炸出：被瞄准的目标吃满额，周围敌人按分摊比例各吃一份，返还额不超过自身最大生命；没有账可讨时空响一声。",
        uses: ["挨打后立刻炸开惩罚贴身的一群", "用撞击把围攻的敌人一起削到", "把承伤转成范围输出"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4,
        prepare: 5,
        active: 0,
        recover: 9,
        cooldown: 32,
        style: "metal",
        defaults: { shrapnel: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(metalburstId, "burstRadius", pokemon), geometry: "area", style: "metal", color: 0xC9B15A,
                label: config && config.shrapnel === true ? "金属爆炸·破片" : "金属爆炸" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[metalburstId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(metalburstId, "brace", context)),
                recover: Math.round(p(metalburstId, "settle", context)),
                cooldown: Math.round(p(metalburstId, "recharge", context)),
                active: 0,
                range: p(metalburstId, "burstRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const record = metalburstRecord(action.sense(), action.actor());
            const amount = record === null ? 0 : record.amount;
            action.present("metalburst:brace", metalburstScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", gather: Math.round(10 + Math.min(70, amount * 0.5)),
                    scale: p(metalburstId, "burstRadius", action) / 1.8, shrapnel: config && config.shrapnel === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const refund = Math.round(p(metalburstId, "refund", action));
            const target = action.target();
            metalburstConsume(self);
            const radius = p(metalburstId, "burstRadius", action);
            const share = p(metalburstId, "shareFraction", action);
            const cap = Math.max(1, Math.round(p(metalburstId, "maximumTargets", action)));
            const scale = radius / 1.8;
            const body = world.observe(self);
            if (body === null) { done(action); return; }

            if (!(refund > 0)) {
                sound(action, "minecraft:block.iron_trapdoor.close");
                WorldFeedback.emit(world, metalburstScene, 1, body.position(), { moment: "whiff", scale: scale }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), metalburstWhiffText, [], 24);
                done(action);
                return;
            }

            const centre = body.position(), primary = target === null ? "" : String(target.ref());
            sound(action, config && config.shrapnel === true ? "minecraft:item.mace.smash_ground_heavy" : "minecraft:block.anvil.land");
            WorldFeedback.emit(world, metalburstScene, 1, centre,
                { moment: "burst", count: Math.round(18 + refund / 2), scale: scale, power: Math.round(refund * 10) / 10 }, 30);

            const found = world.query(centre, radius, false);
            let struck = 0, spilled = 0;
            for (let index = 0; index < found.length && struck < cap; index++) {
                const victim = found[index], ref = String(victim.ref());
                if (ref === String(self.ref())) continue;
                const facts = world.observe(victim);
                if (facts === null || facts.friendly()) continue;
                const amount = ref === primary ? refund : Math.max(1, Math.round(refund * share));
                const landed = metalburstRawHit(action, victim, amount, false);
                struck++;
                if (landed && ref !== primary) spilled++;
                WorldFeedback.emit(world, metalburstScene, 1, facts.position(),
                    { moment: ref === primary ? "burst" : "splash", target: ref, scale: scale,
                        count: Math.round(10 + amount / 2) }, 26);
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.05, 0)), metalburstHitText,
                    [Math.round(amount)], 24);
                world.sound("cobblemon:impact.steel", facts.position(), 15, "{}");
            }
            if (spilled > 0) WorldFeedback.emit(world, metalburstScene, 1, centre,
                { moment: "splash", count: Math.round(10 + spilled * 8), scale: scale }, 24);
            done(action);
        }
    });
}
