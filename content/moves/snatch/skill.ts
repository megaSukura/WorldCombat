/**
 * 抢夺 / snatch —— 执行组织、窗口与借招交接。
 *
 * 核心念头：探出一只手，抓住对手正打算给自己加的那一手——它要给自己用的，被你原样收进自己身上。
 *
 * 一幕分三段：
 *   探（brace，提交前）：身侧凝出一只暗紫的手，指痕指向选定的对手；只播预告，不花任何东西。
 *   张（reach，提交前）：手张在对手面前，`window` 刻里一直等着。期间每 8 刻重播一次，让玩家读出还剩多久。
 *   收（take / empty）：对手提交了带 snatch 旗标的招式时，它的提交被共享闸门顶回去，同一刻施法者用
 *     `NativeLoadout.call` 把那一手接在自己身上——被夺来的招式自己提交、自己结算；窗口没等到东西就空手而回。
 *
 * 与魔法反射分开：魔法反射把朝着自己来的招**弹回去**；抢夺把对手给**自己**的招**拿过来**。
 * 反制：限定了要抢的那一个对手；手够不到、被墙挡住、它不出变化招（或你把它打跑）都会空手而回，不结账。
 */
namespace PokemonSkills {
    export const snatchId = "snatch";
    export const snatchScene = "world_combat:move_snatch";
    export const snatchTakenText = "world_combat.move.snatch.text.taken";
    export const snatchEmptyText = "world_combat.move.snatch.text.empty";

    interface SnatchWindow { snatcher: string; until: number; token: number; reach: number; }
    interface SnatchCaught { move: string; from: string; at: number; }

    /** 谁正把手张在谁面前：目标 ref → 窗口。窗口由施法者的动作驱动，过期或目标失效即作废。 */
    var snatchWindows: { [target: string]: SnatchWindow } = Object.create(null);
    /** 已经抓住、等施法者接手的下一手：施法者 ref → 战利品。 */
    var snatchCaught: { [snatcher: string]: SnatchCaught } = Object.create(null);
    var snatchTokenSeq = 0;

    /** 这一手能不能被夺：已实装、是变化招、带原生 snatch 旗标。 */
    export function snatchStealable(id: string): boolean {
        if (!skills[id]) return false;
        try {
            const move = CobblemonCombat.moveTemplate(id);
            if (String(move.category()) !== "status") return false;
            return !!NativeLoadout.facts(move).flags.snatch;
        } catch (error) {
            return false;
        }
    }

    /** 把夺来的一手接在自己身上；自用与自场招落到原地，朝外招的映射留给别的族，这里只接手能自用的。 */
    export function snatchCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        if (skill.kind === "self") return { eligibility: "caller", input: {} };
        const world = action.sense(), self = action.actor(), body = world.observe(self);
        if (body === null) return null;
        if (skill.kind === "friend") return { eligibility: "caller", input: { target: self, point: body.position() } };
        if (skill.kind === "point" || skill.kind === "motion")
            return { eligibility: "caller", input: { point: body.position(), direction: action.direction() } };
        return null;
    }

    // 窗口的判定端：被选定的对手一旦提交可夺的招式，就把这次提交顶回去，并把战利品留给张手的人。
    // 张手的动作每到一刻会来取一次；取不到就继续等，等到窗口走完。
    WorldCombat.on("world_combat:move_snatch/hook", "world_combat:before_commit", "", function (event) {
        const action = event.action();
        if (action === null) return;
        // 夺来的一手在这里提交，不要再被自己抢回去。
        const content = String(action.content());
        if (content === "world_combat:snatch" || content === "world_combat:magiccoat") return;
        const world = event.world(), actor = event.actor();
        if (String(actor.domain()) !== "cobblemon") return;
        const targetRef = String(actor.ref()), window = snatchWindows[targetRef];
        if (!window) return;
        const now = world.tick();
        if (now > window.until) { delete snatchWindows[targetRef]; return; }
        const executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const id = String(executing.id());
        if (!snatchStealable(id)) return;
        const snatcher = world.actor(window.snatcher), here = world.observe(actor);
        if (snatcher === null || here === null || !world.valid(snatcher)
            || String(snatcher.key()) === String(actor.key()) || world.friendly(snatcher)) {
            delete snatchWindows[targetRef]; return;
        }
        const hand = world.observe(snatcher);
        if (hand === null) { delete snatchWindows[targetRef]; return; }
        if (hand.position().minus(here.position()).length() > window.reach) return;
        if (!world.clear(here.position(), hand.position())) return;
        event.reject("snatched");
        snatchCaught[window.snatcher] = { move: id, from: targetRef, at: now };
    });

    define({
        id: snatchId,
        cooldownParameter: "recharge",
        name: "Snatch",
        description: "探出一只手，抓住选定对手接下来要给自己加的那一手，原样收进自己身上；它没出可夺的招式就空手而回。",
        uses: ["把对手马上要上的增益抢过来", "截走对手的回复与布置", "在对手开打前先夺走它的准备"],
        kind: "enemy",
        range: 6,
        maxRange: 13,
        style: "snatch",
        defaults: { patient: false, ai: { maxChase: 14, opening: "setup", leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[snatchId], detail: { values: config } };
            return { radius: p(snatchId, "reach", context), geometry: "line", style: "snatch", color: 0x7B4FBF,
                label: config && config.patient === true ? "抢夺·屏息" : "抢夺" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[snatchId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(snatchId, "tempo", context)),
                recover: 0,
                cooldown: Math.round(p(snatchId, "recharge", context)),
                active: 0,
                range: p(snatchId, "reach", context)
            };
        },
        run: function (action, _move, config) {
            const patient = !!(config && config.patient);
            const target = action.target();
            const actorRef = String(action.actor().ref()), targetRef = target === null ? "" : String(target.ref());
            const grip = Math.max(1, Math.round(p(snatchId, "grip", action)));
            delete snatchCaught[actorRef];
            action.present("world_combat:move_snatch:brace", snatchScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", target: targetRef, grip: grip, patient: patient ? 1 : 0 }));
            action.after(Math.max(1, Math.round(p(snatchId, "tempo", action))), function (current) {
                const scope = current.sense();
                if (target === null || !scope.valid(target) || scope.friendly(target)) { current.reject("invalid-target"); return; }
                const foe = target;
                const reach = p(snatchId, "reach", current);
                const window = Math.max(20, Math.round(p(snatchId, "window", current)));
                const until = scope.tick() + window;
                const token = ++snatchTokenSeq;
                snatchWindows[targetRef] = { snatcher: actorRef, until: until, token: token, reach: reach };
                function empty(handle: CombatAction): void {
                    if (snatchWindows[targetRef] && snatchWindows[targetRef].token === token) delete snatchWindows[targetRef];
                    delete snatchCaught[actorRef];
                    handle.present("world_combat:move_snatch:empty", snatchScene, 1, handle.origin(),
                        JSON.stringify({ moment: "empty", target: targetRef, grip: grip }));
                    handle.reject("no-snatch");
                }
                function step(handle: CombatAction, elapsed: number): void {
                    const live = handle.sense();
                    const held = snatchWindows[targetRef];
                    if (!held || held.token !== token) { delete snatchCaught[actorRef]; handle.reject("window-lost"); return; }
                    const caught = snatchCaught[actorRef];
                    if (caught !== undefined) {
                        delete snatchCaught[actorRef];
                        delete snatchWindows[targetRef];
                        const options = snatchCall(handle, caught.move);
                        if (options === null) { empty(handle); return; }
                        handle.data("world_combat:snatch/taken", JSON.stringify({ move: caught.move, from: caught.from }));
                        handle.present("world_combat:move_snatch:take", snatchScene, 1, handle.origin(),
                            JSON.stringify({ moment: "take", target: targetRef, grip: grip,
                                path: [targetRef, actorRef], span: window }));
                        NativeLoadout.call(handle, caught.move, { input: options.input, eligibility: "caller",
                            cooldown: p(snatchId, "recharge", handle) });
                        return;
                    }
                    if (!live.valid(foe)) { empty(handle); return; }
                    if (elapsed > window) { empty(handle); return; }
                    if (elapsed % 8 === 0) handle.present("world_combat:move_snatch:reach", snatchScene, 1, handle.origin(),
                        JSON.stringify({ moment: "reach", target: targetRef, grip: grip, remaining: Math.max(0, window - elapsed), span: window }));
                    handle.after(1, function (next) { step(next, elapsed + 1); });
                }
                step(current, 0);
            });
        }
    });

    // 夺到手的那一刻：补上「夺来了 X」的浮字、一道暗紫回抽与音效。被夺来的招式自己的表现随即播出。
    WorldCombat.on("world_combat:move_snatch/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:snatch") return;
        const raw = action.data("world_combat:snatch/taken");
        if (raw === null) return;
        const taken = JSON.parse(raw), world = event.world(), actor = event.actor();
        const body = world.observe(actor);
        if (body === null) return;
        const executing = NativeLoadout.executing(action), id = executing === null ? "" : String(executing.id());
        WorldFeedback.emit(world, snatchScene, 1, body.position(),
            { moment: "take", target: String(actor.ref()), grip: Math.max(1, Math.round(p(snatchId, "grip", action))),
                path: [String(taken.from), String(actor.ref())], span: 0 }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), snatchTakenText,
            [id ? { key: "cobblemon.move." + id, fallback: id } : ""], 36);
        world.sound("minecraft:entity.experience_orb.pickup", body.position(), 12, "{}");
    });
}
