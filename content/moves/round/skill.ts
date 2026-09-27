/**
 * 轮唱 / round 的出手方式。
 *
 * 核心念头：唱出一句能传下去的短歌。这句歌点名一个目标，同时把余韵落在身边同伴身上；带着余韵的人接着唱，
 *   威力翻倍、张口即出。独唱永远只有基础威力，接得上伙伴的那一句才是双倍——歌是声音，掩体挡不住。
 *
 * 三幕：
 *   起（charge，提交前）：在喉头聚起声线、音符绕身打转，只播预告。
 *   传（join）：提交后先把这句歌的余韵落在传唱半径内的同伴身上（共享身份 world_combat:status/round），
 *       每个接到的同伴身上浮起一串音符并显示还能接的秒数，状态图标在效果栏自己倒计时。
 *   唱（verse → impact / miss）：歌句瞬时点到目标身上，声纹在施法者与目标两个真实端点同刻亮起；目标在歌程内
 *       就结算一次声音伤害并炸开一个音符环，不在就唱空。带着余韵起唱（carried）时，这一句是翻倍的那一句，
 *       同时消费掉自己这一份余韵——歌交出去，施法者不能给自己续余韵，接唱因此必须真的接到伙伴那一句。
 *
 * 与同族分开：虫鸣是一道锥形声波扫一片人；轮唱只点名一个目标，却把力量分给同伴——它是合唱的引子。
 */
namespace PokemonSkills {
    define({
        id: roundId,
        cooldownParameter: "recharge",
        name: "Round",
        description: "唱歌攻击一个敌人，同时把余韵传给身边的同伴。同伴在余韵消失前使用轮唱，威力翻倍、起手缩短；声音可以穿过掩体。",
        uses: ["把一句短歌的余韵传给身边的同伴", "接住同伴的余韵唱出翻倍的一句", "用声音无视掩体点名一个目标"],
        kind: "enemy",
        range: 6.5,
        maxRange: 11,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "song",
        defaults: { lead: false, ai: { maxChase: 12, joinRound: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(roundId, "splash", pokemon) : 1.0, geometry: "point", style: "song", color: 0xE8C86A, label: "轮唱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[roundId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const carried = !!(world && actor && world.valid(actor) && CombatStatus.has(world, actor, "round"));
            const prepared = Math.max(4, Math.round(p(roundId, "tempo", context)));
            return {
                prepare: carried ? Math.min(4, prepared) : prepared,
                recover: Math.round(p(roundId, "aftercast", context)),
                cooldown: Math.round(p(roundId, "recharge", context)),
                active: 0,
                range: p(roundId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_round:charge", roundScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, lead: config && config.lead ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const power = p(roundId, "verse", action);
            const radius = p(roundId, "chorusRadius", action);
            const echo = Math.max(40, Math.round(p(roundId, "echoTicks", action)));
            const reach = action.range();
            const splash = p(roundId, "splash", action);
            const notes = Math.max(4, Math.round(p(roundId, "notes", action)));
            const speed = p(roundId, "noteSpeed", action);
            // 威力在消费余韵之前读出，接唱的那一句才是翻倍的那一句。
            const carried = CombatStatus.has(world, actor, "round");
            // 接唱：带着同伴的余韵起唱时，先消费掉自己这一份载体，再把新的一句交给别的同伴。
            const answered = carried && MobEffects.consumeTagged(world, actor, StatusVocabulary.tag("round")).length > 0;
            const target = action.target();
            const targetPos = action.targetPosition();
            const scale = Math.max(0.5, Math.min(2.4, splash));

            sound(action, "minecraft:block.note_block.chime");

            // 传：把余韵落在传唱半径内的同伴身上；谁接上谁就能立刻唱出翻倍的一句。实际交接的伙伴之间移动一个音符。
            let chorus = 0;
            const near = world.query(centre, radius, false);
            for (let index = 0; index < near.length; index++) {
                const other = near[index];
                if (String(other.ref()) === String(actor.ref()) || !world.valid(other) || !world.friendly(other)) continue;
                if (!CombatStatus.apply(world, other, "round", roundCarol, echo, 0)) continue;
                chorus++;
                const at = world.observe(other);
                if (at === null) continue;
                const atPoint = at.position();
                // 余韵落到同伴头上：只需亮出「接上了」与剩余可接秒数，状态图标本身在效果栏倒计时。
                WorldFeedback.emit(world, roundScene, 1, atPoint,
                    { moment: "join", target: String(other.ref()), notes: Math.max(2, Math.round(notes / 2)) }, 24);
                WorldFeedback.text(world, atPoint.plus(WorldCombat.point(0, 1.2, 0)), roundJoinText, [Math.round(echo / 20)], 26);
                world.sound("minecraft:block.note_block.harp", atPoint, 12, "{}");
            }

            // 歌句是瞬时结算的声音：声纹在真实起点（施法者）与真实落点（目标）同刻亮起，不做沿路径的推进。
            WorldFeedback.emit(world, roundScene, 1, centre,
                { moment: "verse", notes: notes, speed: speed, answered: answered ? 1 : 0,
                    chorusAlpha: chorus > 0 ? Math.min(1, 0.25 + chorus * 0.12) : 0 }, 28);

            // 唱：点名一个目标；声音不被掩体阻挡，只要求它在歌程之内。
            let landed = false;
            if (target !== null && world.valid(target) && !world.friendly(target)) {
                const at = world.observe(target);
                const point = at === null ? targetPos : at.position();
                if (point.minus(centre).length() <= reach + 0.6) {
                    landed = hurt(action, target, roundId, power, { damage: damageSpec(roundId, "verse"), sound: true });
                    if (landed) {
                        const hitBody = world.observe(target);
                        const hitPoint = hitBody === null ? point : hitBody.position();
                        WorldFeedback.emit(world, roundScene, 1, hitPoint,
                            { moment: "impact", target: String(target.ref()), notes: notes, splash: splash, scale: scale,
                                intensity: Math.max(0.6, Math.min(2, power / 70)) }, 26);
                        world.sound("minecraft:block.bell.resonate", hitPoint, 14, "{}");
                        if (answered) WorldFeedback.text(world, hitPoint.plus(WorldCombat.point(0, 1.25, 0)), roundVerseText, [Math.round(power)], 30);
                    }
                }
            }
            if (!landed) {
                WorldFeedback.emit(world, roundScene, 1, targetPos, { moment: "miss" }, 20);
                WorldFeedback.text(world, targetPos.plus(WorldCombat.point(0, 1.0, 0)), roundMissText, [], 26);
                world.sound("minecraft:block.note_block.bass", targetPos, 12, "{}");
            }
            done(action);
        }
    });
}
