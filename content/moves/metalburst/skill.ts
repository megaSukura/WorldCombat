/**
 * 金属爆炸 / metalburst 的出手方式。
 *
 * 核心念头：金属外壳把挨过的打击震成应力存着（不分物理特殊），出招时从体内向外炸开，
 * 把那份应力以 1.5 倍炸在对手身上，迸裂的碎片再削到周围的敌人。
 *
 * 两幕：
 *   起（windup，提交前）：外壳泛起应力纹、火星沿体表乱窜；账越大纹路越密（present brace）。
 *   爆（execute）：以自身为中心炸开，选中且实际落在自身圈内、与本体通视的敌人才吃满额并优先占首名额；
 *       圈内其余敌人按分摊比例各吃一份，墙后的人不挨片；命中反馈由真实伤害回执给出；没有账可讨时空响一声（whiff）。
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
        kind: "aim",
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

            // 圆心始终是自己：aim 只决定是谁在什么方向触发，爆心不跟着瞄准点走。
            const centre = body.position();
            const selfRef = String(self.ref());
            // 敌实体只有当它真的落在自身爆圈内、且与本体之间通视时，才作为吃满额的主目标。
            const primary = target !== null && world.valid(target) && !world.friendly(target) ? target : null;
            const primaryRef = primary === null ? "" : String(primary.ref());
            sound(action, config && config.shrapnel === true ? "minecraft:item.mace.smash_ground_heavy" : "minecraft:block.anvil.land");
            WorldFeedback.emit(world, metalburstScene, 1, centre,
                { moment: "burst", count: Math.round(18 + refund / 2), scale: scale, power: Math.round(refund * 10) / 10 }, 30);

            const found = world.query(centre, radius, false);
            const others: CombatActor[] = [];
            let primaryInCircle = false;
            for (let index = 0; index < found.length; index++) {
                const victim = found[index], ref = String(victim.ref());
                if (ref === selfRef) continue;
                const facts = world.observe(victim);
                if (facts === null || facts.friendly()) continue;
                // 真实通视：从自身爆心到本体的射线被墙挡住就不挨片（近墙后的人不在这一圈里）。
                if (!world.clear(centre, facts.position())) continue;
                if (primary !== null && ref === primaryRef) { primaryInCircle = true; continue; }
                others.push(victim);
            }
            // 主目标优先占首名额，不会被无关小怪先把 cap 用光；圈外/被挡的主目标不吃满额，只按普通对象处理。
            const ordered: CombatActor[] = primaryInCircle && primary !== null ? [primary].concat(others) : others;
            action.data("metalburst/strike", JSON.stringify({ scale: scale, primary: primaryInCircle ? primaryRef : "",
                cx: centre.x(), cy: centre.y(), cz: centre.z() }));
            // 命中反馈统一交给真实伤害回执（listener 里按对象分别发 core/splash 与浮字）；
            // 这里只处理被免疫/被挡下、没有回执可读的对象。
            let struck = 0;
            for (let index = 0; index < ordered.length && struck < cap; index++) {
                const victim = ordered[index], ref = String(victim.ref());
                const isPrimary = primaryInCircle && ref === primaryRef;
                const amount = isPrimary ? refund : Math.max(1, Math.round(refund * share));
                const facts = world.observe(victim);
                const landed = metalburstRawHit(action, victim, amount, false);
                struck++;
                if (!landed && facts !== null) {
                    WorldFeedback.emit(world, metalburstScene, 1, facts.position(), { moment: "blocked", scale: scale }, 20);
                    world.sound("cobblemon:impact.steel", facts.position(), 15, "{}");
                }
            }
            done(action);
        }
    });
}
