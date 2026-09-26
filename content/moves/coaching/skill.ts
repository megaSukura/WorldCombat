/**
 * 指导 / coaching — 执行组织。
 *
 * 核心念头：施法者朝选定的伙伴大喝一声、比出一个明确的手势，把正确的打法当场教给他；身边听清的人一起领会，
 *   攻防同时抬起来。它必须**选一个朋友**，给不出对象就不出手。
 *
 * 两幕：
 *   喊（windup 播「提气」）。
 *   教（提交后）：受教的伙伴攻防各抬一档，身边传授半径内听清的友方一起领会；每人挂共享身份
 *     world_combat:status/coaching 的真实 MobEffect（物攻、防御各一份，用效果等级记住实际抬到几级）。
 * 持续：每 20 刻在受教者身上续一次叮嘱标记。
 * 结束：窗口到期或被清除时，按各自等级把物攻、防御原样收回。
 * 输入形状：kind friend，玩家必须先选一个伙伴；没有对象拒绝施放。
 */
namespace PokemonSkills {
    const coachingScene = "world_combat:move_coaching";
    const coachingDrill = "world_combat:coaching_drill";
    const coachingStance = "world_combat:coaching_stance";
    const coachingText = "world_combat.move.coaching.text.drill";
    const coachingFadeText = "world_combat.move.coaching.text.fade";

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function coachingStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function coachingGrant(world: CombatWorld, actor: CombatActor, stat: string, want: number): number {
        const before = coachingStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, want);
        return Math.max(0, coachingStage(world, actor, stat) - before);
    }

    /** 教一个战斗者：攻防各抬一档、挂身份；已经带着同一身份的人不重复教，返回这次教到的实际级数。 */
    function coachingTeach(world: CombatWorld, actor: CombatActor, atk: number, def: number, ticks: number): { atk: number; def: number } | null {
        if (MobEffects.read(world, actor, coachingDrill) !== null) return null;
        const grantedAtk = coachingGrant(world, actor, "atk", atk);
        const grantedDef = coachingGrant(world, actor, "def", def);
        MobEffects.apply(world, actor, coachingDrill, ticks, grantedAtk);
        MobEffects.apply(world, actor, coachingStance, ticks, grantedDef);
        return { atk: grantedAtk, def: grantedDef };
    }

    /** 一次领会的表现：drill 落在受教者身上，learn 用 path 从受教者连到实际同学。 */
    function coachingEmit(world: CombatWorld, actor: CombatActor, moment: string, atk: number, def: number,
        motes: number, path: string[] | null): void {
        const body = world.observe(actor);
        if (body === null) return;
        const data: any = { moment: moment, target: String(actor.ref()), atk: atk, def: def, motes: motes,
            intensity: Math.max(0.7, Math.min(2, (atk + def) / 2 + 0.4)) };
        if (path !== null) data.path = path;
        WorldFeedback.emit(world, coachingScene, 1, body.position(), data, moment === "drill" ? 30 : 22);
    }

    define({
        id: "coaching",
        cooldownParameter: "wait",
        name: "指导",
        description: "对一个选定的伙伴进行指导，让他的攻击与防御一起提高，并从那个伙伴向四周教给身边听清的友方；必须选一个朋友。窗口走完时等级一起收回。",
        uses: ["把上前的队友攻防一起垫高", "让缠斗中的伙伴顶得更稳、打得更重", "在开门前把守门的伙伴教成一面墙"],
        kind: "friend",
        range: 5,
        maxRange: 7,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "drill",
        stationary: true,
        defaults: { drill: 1, ai: { maxChase: 12, prefer: "engaged" } },
        fields: [
            field(pathOf("drill"), "教法", "choice", {
                options: [
                    { value: 1, label: "精讲" },
                    { value: 0, label: "速令" }
                ],
                help: "精讲：领会时长 ×1.4，但传授半径 ×0.75、起手 +3、冷却 ×1.15——教得深、覆盖小；速令：半径 ×1.25、起手 −2、冷却 ×0.85，但窗口 ×0.75——传得广、记得浅。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["coaching"], detail: { values: config } };
            return { radius: p("coaching", "reach", context), geometry: "point", style: "drill", color: 0xF2C15A,
                label: config && Number(config.drill) === 1 ? "指导 · 精讲" : "指导 · 速令" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["coaching"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("coaching", "tempo", context)),
                recover: Math.round(p("coaching", "aftercast", context)),
                cooldown: Math.round(p("coaching", "wait", context)),
                active: 1,
                range: p("coaching", "reach", context)
            };
        },
        ready: function (action, _config) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "no-self";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_coaching:call", coachingScene, 1, action.origin(),
                JSON.stringify({ moment: "call", drill: config && Number(config.drill) === 1 ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)
                || String(target.ref()) === String(actor.ref())) { done(action); return; }
            const atk = Math.max(1, Math.min(2, Math.round(p("coaching", "giftAtk", action))));
            const def = Math.max(1, Math.min(2, Math.round(p("coaching", "giftDef", action))));
            const window = Math.max(100, Math.round(p("coaching", "window", action)));
            const splash = Math.max(1.2, p("coaching", "splash", action));
            const motes = Math.max(6, Math.round(p("coaching", "motes", action)));
            const coach = world.observe(target);
            if (coach === null) { done(action); return; }
            const main = coachingTeach(world, target, atk, def, window);
            let reached = main === null ? 0 : 1;
            // 以受教者为阵心、这一次施放固定下来的一圈；只教没带着指导的伙伴。
            const students: { actor: CombatActor; atk: number; def: number }[] = [];
            const actors = world.query(coach.position(), splash, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (String(other.key()) === String(target.key())) continue;
                if (!world.friendly(other) || world.observe(other) === null) continue;
                const grants = coachingTeach(world, other, atk, def, window);
                if (grants !== null) { reached++; students.push({ actor: other, atk: grants.atk, def: grants.def }); }
            }
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, coachingScene, 1, body.position(),
                    { moment: "shout", path: [String(actor.ref()), String(target.ref())], target: String(target.ref()),
                        motes: motes, atk: atk, def: def, scale: Math.max(0.7, Math.min(2, splash / 3)) }, 26);
            }
            if (main !== null) coachingEmit(world, target, "drill", main.atk, main.def, motes, null);
            // learn 从受教者连到每个真正领会的同学，指着这次实际传开的人。
            const learnMotes = Math.max(6, Math.round(motes * 0.5));
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                coachingEmit(world, student.actor, "learn", student.atk, student.def, learnMotes,
                    [String(target.ref()), String(student.actor.ref())]);
            }
            WorldFeedback.text(world, coach.position().plus(WorldCombat.point(0, 1.4, 0)), coachingText,
                [atk, def, reached, Math.round(window / 20)], 32);
            world.sound("minecraft:entity.villager.yes", coach.position(), 16, "{}");
            world.sound("minecraft:block.note_block.pling", coach.position(), 14, "{}");
            done(action);
        }
    });

    // 领会期：每 20 刻在受教者身边续一次叮嘱标记，低密度、慢节奏。
    WorldCombat.on("world_combat:move_coaching/ready", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== coachingDrill) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const drill = MobEffects.read(world, actor, coachingDrill);
        const body = world.observe(actor);
        if (drill === null || body === null) return;
        WorldFeedback.keep(world, "coaching:ready:" + String(actor.ref()), coachingScene, 1, body.position(),
            { moment: "ready", target: String(actor.ref()), motes: 12, atk: drill.amplifier() }, 40);
    });

    // 物攻那一份到期或被清除：按效果等级把物攻原样收回。
    WorldCombat.on("world_combat:move_coaching/atk-fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== coachingDrill) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const loss = Math.min(Math.max(0, Math.round(Number(data.amplifier) || 0)), Math.max(0, coachingStage(world, actor, "atk")));
        if (loss > 0) NativeEffects.boost(world, actor, "atk", -loss);
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, coachingScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), lost: loss }, 20);
    });

    // 防御那一份到期或被清除：按效果等级把防御原样收回。
    WorldCombat.on("world_combat:move_coaching/def-fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== coachingStance) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const loss = Math.min(Math.max(0, Math.round(Number(data.amplifier) || 0)), Math.max(0, coachingStage(world, actor, "def")));
        if (loss > 0) NativeEffects.boost(world, actor, "def", -loss);
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), coachingFadeText, [], 20);
    });
}
