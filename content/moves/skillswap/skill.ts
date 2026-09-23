/**
 * 特性互换 / skillswap —— 执行组织与可逆对调。
 *
 * 核心念头：用念力把两个人的特性在中间对调——你把手里的身份递过去，换回对方的那一个，之后各自按对方的身份打这一段。
 *
 * 三幕：
 *   描（windup，提交前）：两份特性在两人之间被描出、对齐，只播预告，可被打断且不花代价。
 *   换（trade，提交后）：读出双方当前有效特性（含临时覆盖），确认都可被交换、且不相同；把对方的特性通过共享
 *     NativeModifiers ability 层披到自己身上、把自己的披到对方身上；两人各挂共享身份 world_combat:status/skillswap
 *     的窗口与一枚机读记号（记下自己那层与对方那层的效果 id、对方是谁）。
 *   还（revert）：窗口走完或被外力（牛奶、清除效果）解除时，按记号把两侧的层一起撤掉，各自回到原本的特性。
 *
 * 为什么两侧一起撤：对调是两件事，但对外是一件事。两侧都存着两条层 id，任一侧的窗口先结束，都会顺着记号
 *   把两侧的层与窗口一起收掉，避免出现「一边换了、一边没换」的半截状态；重复触发因为记号已被撤而自然止住。
 *
 * 与同族分开：扮演只单向抄一份对手的特性；特性互换是**双向**的，你也要交出自己的身份，且两边同时改。
 * 非宝可梦没有特性层，`ready` 直接拒绝，不浪费 PP。
 */
namespace PokemonSkills {
    const skillswapScene = "world_combat:move_skillswap";
    const skillswapShift = "world_combat:skillswap_shift";
    const skillswapMark = "world_combat:skillswap_mark";
    const skillswapGainText = "world_combat.move.skillswap.text.gain";
    const skillswapSameText = "world_combat.move.skillswap.text.same";
    const skillswapAbilityReturnText = "world_combat.move.skillswap.text.returned";
    const skillswapAbilityPattern = /^[a-z0-9]{1,64}$/;

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function skillswapAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        return NativeEffects.ability(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
    }
    /** 目标特性是否允许被交换（原生 failskillswap 标记）。 */
    function skillswapSwappable(ability: string): boolean {
        return !!ability && skillswapAbilityPattern.test(ability) && !NativeAbilities.flag(ability, "failskillswap");
    }

    WorldCombat.effect(skillswapMark, 1, 12600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.layer !== "number" || !isFinite(value.layer)) throw new Error("Invalid skill swap layer");
        if (typeof value.paired !== "number" || !isFinite(value.paired)) throw new Error("Invalid skill swap pair layer");
        if (typeof value.pair !== "string") throw new Error("Invalid skill swap partner");
        if (typeof value.got !== "string") throw new Error("Invalid skill swap ability");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(skillswapMark, "start", function () { });
    WorldCombat.effectHandler(skillswapMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 撤掉一次交换：清自己的层与记号，再顺着记号把对方那侧也清掉；返回自己换到的特性。 */
    function skillswapSettle(world: CombatWorld, actor: CombatActor): string {
        const views = world.effects(actor, skillswapMark);
        if (views.length === 0) return "";
        const mark = JSON.parse(String(views[0].data()));
        if (typeof mark.layer === "number") world.operation(mark.layer, "world_combat:dispel", "{}");
        world.operation(views[0].id(), "world_combat:dispel", "{}");
        const partner = world.actor(String(mark.pair));
        if (partner !== null && world.valid(partner)) {
            const others = world.effects(partner, skillswapMark).filter(view => {
                const other = JSON.parse(String(view.data()));
                return other.layer === mark.paired && other.paired === mark.layer && other.pair === String(actor.ref());
            });
            if (others.length) {
                const other = JSON.parse(String(others[0].data()));
                if (typeof other.layer === "number") world.operation(other.layer, "world_combat:dispel", "{}");
                world.operation(others[0].id(), "world_combat:dispel", "{}");
            }
            if (others.length && world.effects(partner, skillswapMark).length === 0) MobEffects.consume(world, partner, skillswapShift);
        }
        return String(mark.got || "");
    }

    define({
        id: "skillswap",
        cooldownParameter: "recharge",
        name: "特性互换",
        description: "用念力把自己与目标的特性对调一段时间：你拿到它的、它拿到你的，窗口走完各自换回。",
        uses: ["把对手的强力特性取过来自己用", "把自己的负面特性甩给对手", "打乱对手依赖特性建立的打法"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 7,
        cooldown: 90,
        style: "trade",
        defaults: { hold: false, ai: { maxChase: 14, requireActive: false, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["skillswap"], detail: { values: config } };
            return { radius: p("skillswap", "reach", context), geometry: "line", style: "trade", color: 0xC24AE8,
                label: config && config.hold === true ? "特性互换 · 久换" : "特性互换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["skillswap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("skillswap", "tempo", context)),
                recover: Math.round(p("skillswap", "aftercast", context)),
                cooldown: Math.round(p("skillswap", "recharge", context)),
                active: 1,
                range: p("skillswap", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return "no-ability";
            if (world.effects(actor, skillswapMark).length || world.effects(target, skillswapMark).length) return "already-swapped";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("skillswap", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const mine = skillswapAbility(world, actor), theirs = skillswapAbility(world, target);
            if (!mine) return "self-suppressed";
            if (!theirs) return "target-suppressed";
            if (!skillswapSwappable(theirs)) return "uncopyable";
            if (!skillswapSwappable(mine)) return "self-locked";
            if (mine === theirs) return "already-same";
            return "";
        },
        windup: function (action, config, prepare) {
            const actor = action.actor(), target = action.target();
            const path = target === null ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())];
            action.present("world_combat:skillswap:trace", skillswapScene, 1, action.origin(), JSON.stringify({
                moment: "trace", target: target === null ? "" : String(target.ref()), path: path,
                glyphs: p("skillswap", "glyphs", action)
            }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null || world.friendly(target)
                || String(actor.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") { done(action); return; }
            const mine = skillswapAbility(world, actor), theirs = skillswapAbility(world, target);
            if (!mine || !theirs || !skillswapSwappable(mine) || !skillswapSwappable(theirs) || mine === theirs) {
                WorldFeedback.emit(world, skillswapScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), skillswapSameText, [], 26);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const window = Math.max(60, Math.round(p("skillswap", "window", action)));
            const glyphs = Math.max(6, Math.round(p("skillswap", "glyphs", action)));
            const layerMine = NativeModifiers.apply(world, actor, { ability: theirs }, window + 40);
            const layerTheirs = NativeModifiers.apply(world, target, { ability: mine }, window + 40);
            const markMine = { layer: layerMine, paired: layerTheirs, pair: String(target.ref()), got: theirs, glyphs: glyphs };
            const markTheirs = { layer: layerTheirs, paired: layerMine, pair: String(actor.ref()), got: mine, glyphs: glyphs };
            world.effect(skillswapMark, actor, JSON.stringify(markMine), window + 60);
            world.effect(skillswapMark, target, JSON.stringify(markTheirs), window + 60);
            MobEffects.apply(world, actor, skillswapShift, window, 0);
            MobEffects.apply(world, target, skillswapShift, window, 0);
            const intensity = Math.max(0.7, Math.min(2, window / 320));
            const path = [String(actor.ref()), String(target.ref())];
            WorldFeedback.emit(world, skillswapScene, 1, body.position(),
                { moment: "trade", target: String(target.ref()), path: path, glyphs: glyphs, intensity: intensity }, 36);
            const targetBody = world.observe(target);
            if (targetBody !== null)
                WorldFeedback.emit(world, skillswapScene, 1, targetBody.position(),
                    { moment: "trade", target: String(actor.ref()), path: path, glyphs: glyphs, intensity: intensity }, 36);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), skillswapGainText,
                [{ key: "cobblemon.ability." + theirs, fallback: theirs }], 40);
            if (targetBody !== null) WorldFeedback.text(world, targetBody.position().plus(WorldCombat.point(0, 1.3, 0)), skillswapGainText,
                [{ key: "cobblemon.ability." + mine, fallback: mine }], 40);
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 14, "{}");
            done(action);
        }
    });

    // 对调存续期：每 20 刻在两人身上续一次低密度符光，让玩家读出现在还换着、还剩多久。
    WorldCombat.on("world_combat:move_skillswap/hum", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== skillswapShift) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const views = world.effects(actor, skillswapMark);
        if (!views.length) { MobEffects.consume(world, actor, skillswapShift); return; }
        const mark = JSON.parse(String(views[0].data()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_skillswap/hum/" + String(actor.ref()), skillswapScene, 1, body.position(),
            { moment: "hum", target: String(actor.ref()), path: [String(actor.ref()), String(mark.pair)],
                glyphs: Math.max(4, Math.round((Number(mark.glyphs) || 8) / 2)), remaining: views[0].remaining() }, 40);
    });

    // 窗口走完或被清除：两侧一起换回原本的特性；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_skillswap/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== skillswapShift) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, skillswapShift) !== null) return;
        const got = skillswapSettle(world, actor);
        if (!got) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, skillswapScene, 1, body.position(), { moment: "revert", target: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), skillswapAbilityReturnText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
