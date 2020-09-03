/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2020 Photon Storm Ltd.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

var Animation = require('./Animation');
var Class = require('../utils/Class');
var CustomMap = require('../structs/Map');
var EventEmitter = require('eventemitter3');
var Events = require('./events');
var GameEvents = require('../core/events');
var GetValue = require('../utils/object/GetValue');
var Pad = require('../utils/string/Pad');

/**
 * @classdesc
 * The Animation Manager.
 *
 * Animations are managed by the global Animation Manager. This is a singleton class that is
 * responsible for creating and delivering animations and their corresponding data to all Game Objects.
 * Unlike plugins it is owned by the Game instance, not the Scene.
 *
 * Sprites and other Game Objects get the data they need from the AnimationManager.
 *
 * @class AnimationManager
 * @extends Phaser.Events.EventEmitter
 * @memberof Phaser.Animations
 * @constructor
 * @since 3.0.0
 *
 * @param {Phaser.Game} game - A reference to the Phaser.Game instance.
 */
var AnimationManager = new Class({

    Extends: EventEmitter,

    initialize:

    function AnimationManager (game)
    {
        EventEmitter.call(this);

        /**
         * A reference to the Phaser.Game instance.
         *
         * @name Phaser.Animations.AnimationManager#game
         * @type {Phaser.Game}
         * @protected
         * @since 3.0.0
         */
        this.game = game;

        /**
         * A reference to the Texture Manager.
         *
         * @name Phaser.Animations.AnimationManager#textureManager
         * @type {Phaser.Textures.TextureManager}
         * @protected
         * @since 3.0.0
         */
        this.textureManager = null;

        /**
         * The global time scale of the Animation Manager.
         *
         * This scales the time delta between two frames, thus influencing the speed of time for the Animation Manager.
         *
         * @name Phaser.Animations.AnimationManager#globalTimeScale
         * @type {number}
         * @default 1
         * @since 3.0.0
         */
        this.globalTimeScale = 1;

        /**
         * The Animations registered in the Animation Manager.
         *
         * This map should be modified with the {@link #add} and {@link #create} methods of the Animation Manager.
         *
         * @name Phaser.Animations.AnimationManager#anims
         * @type {Phaser.Structs.Map.<string, Phaser.Animations.Animation>}
         * @protected
         * @since 3.0.0
         */
        this.anims = new CustomMap();

        /**
         * Whether the Animation Manager is paused along with all of its Animations.
         *
         * @name Phaser.Animations.AnimationManager#paused
         * @type {boolean}
         * @default false
         * @since 3.0.0
         */
        this.paused = false;

        /**
         * The name of this Animation Manager.
         *
         * @name Phaser.Animations.AnimationManager#name
         * @type {string}
         * @since 3.0.0
         */
        this.name = 'AnimationManager';

        game.events.once(GameEvents.BOOT, this.boot, this);
    },

    /**
     * Registers event listeners after the Game boots.
     *
     * @method Phaser.Animations.AnimationManager#boot
     * @listens Phaser.Core.Events#DESTROY
     * @since 3.0.0
     */
    boot: function ()
    {
        this.textureManager = this.game.textures;

        this.game.events.once(GameEvents.DESTROY, this.destroy, this);
    },

    /**
     * Adds an existing Animation to the Animation Manager.
     *
     * @method Phaser.Animations.AnimationManager#add
     * @fires Phaser.Animations.Events#ADD_ANIMATION
     * @since 3.0.0
     *
     * @param {string} key - The key under which the Animation should be added. The Animation will be updated with it. Must be unique.
     * @param {Phaser.Animations.Animation} animation - The Animation which should be added to the Animation Manager.
     *
     * @return {this} This Animation Manager.
     */
    add: function (key, animation)
    {
        if (this.anims.has(key))
        {
            console.warn('Animation key exists: ' + key);

            return this;
        }

        animation.key = key;

        this.anims.set(key, animation);

        this.emit(Events.ADD_ANIMATION, key, animation);

        return this;
    },

    /**
     * Checks to see if the given key is already in use within the Animation Manager or not.
     *
     * Animations are global. Keys created in one scene can be used from any other Scene in your game. They are not Scene specific.
     *
     * @method Phaser.Animations.AnimationManager#exists
     * @since 3.16.0
     *
     * @param {string} key - The key of the Animation to check.
     *
     * @return {boolean} `true` if the Animation already exists in the Animation Manager, or `false` if the key is available.
     */
    exists: function (key)
    {
        return this.anims.has(key);
    },

    /**
     * Creates a new Animation and adds it to the Animation Manager.
     *
     * Animations are global. Once created, you can use them in any Scene in your game. They are not Scene specific.
     *
     * If an invalid key is given this method will return `false`.
     *
     * If you pass the key of an animation that already exists in the Animation Manager, that animation will be returned.
     *
     * A brand new animation is only created if the key is valid and not already in use.
     *
     * If you wish to re-use an existing key, call `AnimationManager.remove` first, then this method.
     *
     * @method Phaser.Animations.AnimationManager#create
     * @fires Phaser.Animations.Events#ADD_ANIMATION
     * @since 3.0.0
     *
     * @param {Phaser.Types.Animations.Animation} config - The configuration settings for the Animation.
     *
     * @return {(Phaser.Animations.Animation|false)} The Animation that was created, or `false` if the key is already in use.
     */
    create: function (config)
    {
        var key = config.key;

        var anim = false;

        if (key)
        {
            anim = this.get(key);

            if (!anim)
            {
                anim = new Animation(this, key, config);

                this.anims.set(key, anim);

                this.emit(Events.ADD_ANIMATION, key, anim);
            }
        }

        return anim;
    },

    /**
     * Loads this Animation Manager's Animations and settings from a JSON object.
     *
     * @method Phaser.Animations.AnimationManager#fromJSON
     * @since 3.0.0
     *
     * @param {(string|Phaser.Types.Animations.JSONAnimations|Phaser.Types.Animations.JSONAnimation)} data - The JSON object to parse.
     * @param {boolean} [clearCurrentAnimations=false] - If set to `true`, the current animations will be removed (`anims.clear()`). If set to `false` (default), the animations in `data` will be added.
     *
     * @return {Phaser.Animations.Animation[]} An array containing all of the Animation objects that were created as a result of this call.
     */
    fromJSON: function (data, clearCurrentAnimations)
    {
        if (clearCurrentAnimations === undefined) { clearCurrentAnimations = false; }

        if (clearCurrentAnimations)
        {
            this.anims.clear();
        }

        //  Do we have a String (i.e. from JSON, or an Object?)
        if (typeof data === 'string')
        {
            data = JSON.parse(data);
        }

        var output = [];

        //  Array of animations, or a single animation?
        if (data.hasOwnProperty('anims') && Array.isArray(data.anims))
        {
            for (var i = 0; i < data.anims.length; i++)
            {
                output.push(this.create(data.anims[i]));
            }

            if (data.hasOwnProperty('globalTimeScale'))
            {
                this.globalTimeScale = data.globalTimeScale;
            }
        }
        else if (data.hasOwnProperty('key') && data.type === 'frame')
        {
            output.push(this.create(data));
        }

        return output;
    },

    /**
     * Generate an array of {@link Phaser.Types.Animations.AnimationFrame} objects from a texture key and configuration object.
     *
     * Generates objects with string based frame names, as configured by the given {@link Phaser.Types.Animations.GenerateFrameNames}.
     *
     * It's a helper method, designed to make it easier for you to extract all of the frame names from texture atlases.
     * If you're working with a sprite sheet, see the `generateFrameNumbers` method instead.
     *
     * Example:
     *
     * If you have a texture atlases loaded called `gems` and it contains 6 frames called `ruby_0001`, `ruby_0002`, and so on,
     * then you can call this method using: `this.anims.generateFrameNames('gems', { prefix: 'ruby_', end: 6, zeroPad: 4 })`.
     *
     * The `end` value tells it to look for 6 frames, incrementally numbered, all starting with the prefix `ruby_`. The `zeroPad`
     * value tells it how many zeroes pad out the numbers. To create an animation using this method, you can do:
     *
     * ```javascript
     * this.anims.create({
     *   key: 'ruby',
     *   repeat: -1,
     *   frames: this.anims.generateFrameNames('gems', {
     *     prefix: 'ruby_',
     *     end: 6,
     *     zeroPad: 4
     *   })
     * });
     * ```
     *
     * Please see the animation examples for further details.
     *
     * @method Phaser.Animations.AnimationManager#generateFrameNames
     * @since 3.0.0
     *
     * @param {string} key - The key for the texture containing the animation frames.
     * @param {Phaser.Types.Animations.GenerateFrameNames} [config] - The configuration object for the animation frame names.
     *
     * @return {Phaser.Types.Animations.AnimationFrame[]} The array of {@link Phaser.Types.Animations.AnimationFrame} objects.
     */
    generateFrameNames: function (key, config)
    {
        var prefix = GetValue(config, 'prefix', '');
        var start = GetValue(config, 'start', 0);
        var end = GetValue(config, 'end', 0);
        var suffix = GetValue(config, 'suffix', '');
        var zeroPad = GetValue(config, 'zeroPad', 0);
        var out = GetValue(config, 'outputArray', []);
        var frames = GetValue(config, 'frames', false);

        var texture = this.textureManager.get(key);

        if (!texture)
        {
            return out;
        }

        var diff = (start < end) ? 1 : -1;

        //  Adjust because we use i !== end in the for loop
        end += diff;

        var i;
        var frame;

        if (!config)
        {
            //  Use every frame in the atlas?
            frames = texture.getFrameNames();

            for (i = 0; i < frames.length; i++)
            {
                out.push({ key: key, frame: frames[i] });
            }
        }
        else if (Array.isArray(frames))
        {
            //  Have they provided their own custom frame sequence array?
            for (i = 0; i < frames.length; i++)
            {
                frame = prefix + Pad(frames[i], zeroPad, '0', 1) + suffix;

                if (texture.has(frame))
                {
                    out.push({ key: key, frame: frame });
                }
            }
        }
        else
        {
            for (i = start; i !== end; i += diff)
            {
                frame = prefix + Pad(i, zeroPad, '0', 1) + suffix;

                if (texture.has(frame))
                {
                    out.push({ key: key, frame: frame });
                }
            }
        }

        return out;
    },

    /**
     * Generate an array of {@link Phaser.Types.Animations.AnimationFrame} objects from a texture key and configuration object.
     *
     * Generates objects with numbered frame names, as configured by the given {@link Phaser.Types.Animations.GenerateFrameNumbers}.
     *
     * If you're working with a texture atlas, see the `generateFrameNames` method instead.
     *
     * @method Phaser.Animations.AnimationManager#generateFrameNumbers
     * @since 3.0.0
     *
     * @param {string} key - The key for the texture containing the animation frames.
     * @param {Phaser.Types.Animations.GenerateFrameNumbers} config - The configuration object for the animation frames.
     *
     * @return {Phaser.Types.Animations.AnimationFrame[]} The array of {@link Phaser.Types.Animations.AnimationFrame} objects.
     */
    generateFrameNumbers: function (key, config)
    {
        var startFrame = GetValue(config, 'start', 0);
        var endFrame = GetValue(config, 'end', -1);
        var firstFrame = GetValue(config, 'first', false);
        var out = GetValue(config, 'outputArray', []);
        var frames = GetValue(config, 'frames', false);

        var texture = this.textureManager.get(key);

        if (!texture)
        {
            return out;
        }

        if (firstFrame && texture.has(firstFrame))
        {
            out.push({ key: key, frame: firstFrame });
        }

        var i;

        //  Have they provided their own custom frame sequence array?
        if (Array.isArray(frames))
        {
            for (i = 0; i < frames.length; i++)
            {
                if (texture.has(frames[i]))
                {
                    out.push({ key: key, frame: frames[i] });
                }
            }
        }
        else
        {
            //  No endFrame then see if we can get it
            if (endFrame === -1)
            {
                endFrame = texture.frameTotal;
            }

            var diff = (startFrame < endFrame) ? 1 : -1;

            //  Adjust because we use i !== end in the for loop
            endFrame += diff;

            for (i = startFrame; i !== endFrame; i += diff)
            {
                if (texture.has(i))
                {
                    out.push({ key: key, frame: i });
                }
            }
        }

        return out;
    },

    /**
     * Get an Animation.
     *
     * @method Phaser.Animations.AnimationManager#get
     * @since 3.0.0
     *
     * @param {string} key - The key of the Animation to retrieve.
     *
     * @return {Phaser.Animations.Animation} The Animation.
     */
    get: function (key)
    {
        return this.anims.get(key);
    },

    /**
     * Pause all animations.
     *
     * @method Phaser.Animations.AnimationManager#pauseAll
     * @fires Phaser.Animations.Events#PAUSE_ALL
     * @since 3.0.0
     *
     * @return {this} This Animation Manager.
     */
    pauseAll: function ()
    {
        if (!this.paused)
        {
            this.paused = true;

            this.emit(Events.PAUSE_ALL);
        }

        return this;
    },

    /**
     * Play an animation on the given Game Objects that have an Animation Component.
     *
     * @method Phaser.Animations.AnimationManager#play
     * @since 3.0.0
     *
     * @param {(string|Phaser.Animations.Animation|Phaser.Types.Animations.PlayAnimationConfig)} key - The string-based key of the animation to play, or an Animation instance, or a `PlayAnimationConfig` object.
     * @param {Phaser.GameObjects.GameObject|Phaser.GameObjects.GameObject[]} children - An array of Game Objects to play the animation on. They must have an Animation Component.
     *
     * @return {this} This Animation Manager.
     */
    play: function (key, children)
    {
        if (!Array.isArray(children))
        {
            children = [ children ];
        }

        for (var i = 0; i < children.length; i++)
        {
            children[i].anims.play(key);
        }

        return this;
    },

    /**
     * Takes an array of Game Objects that have an Animation Component and then
     * starts the given animation playing on them. The start time of each Game Object
     * is offset, incrementally, by the `stagger` amount.
     *
     * For example, if you pass an array with 4 children and a stagger time of 1000,
     * the delays will be:
     *
     * child 1: 1000ms delay
     * child 2: 2000ms delay
     * child 3: 3000ms delay
     * child 4: 4000ms delay
     *
     * If you set the `staggerFirst` parameter to `false` they would be:
     *
     * child 1: 0ms delay
     * child 2: 1000ms delay
     * child 3: 2000ms delay
     * child 4: 3000ms delay
     *
     * You can also set `stagger` to be a negative value. If it was -1000, the above would be:
     *
     * child 1: 3000ms delay
     * child 2: 2000ms delay
     * child 3: 1000ms delay
     * child 4: 0ms delay
     *
     * @method Phaser.Animations.AnimationManager#staggerPlay
     * @since 3.0.0
     *
     * @generic {Phaser.GameObjects.GameObject[]} G - [items,$return]
     *
     * @param {(string|Phaser.Animations.Animation|Phaser.Types.Animations.PlayAnimationConfig)} key - The string-based key of the animation to play, or an Animation instance, or a `PlayAnimationConfig` object.
     * @param {Phaser.GameObjects.GameObject|Phaser.GameObjects.GameObject[]} children - An array of Game Objects to play the animation on. They must have an Animation Component.
     * @param {number} stagger - The amount of time, in milliseconds, to offset each play time by. If a negative value is given, it's applied to the children in reverse order.
     * @param {boolean} [staggerFirst=true] -Should the first child be staggered as well?
     *
     * @return {this} This Animation Manager.
     */
    staggerPlay: function (key, children, stagger, staggerFirst)
    {
        if (stagger === undefined) { stagger = 0; }
        if (staggerFirst === undefined) { staggerFirst = true; }

        if (!Array.isArray(children))
        {
            children = [ children ];
        }

        var len = children.length;

        if (!staggerFirst)
        {
            len--;
        }

        for (var i = 0; i < children.length; i++)
        {
            var time = (stagger < 0) ? Math.abs(stagger) * (len - i) : stagger * i;

            children[i].anims.delayedPlay(time, key);
        }

        return this;
    },

    /**
     * Removes an Animation from this Animation Manager, based on the given key.
     *
     * This is a global action. Once an Animation has been removed, no Game Objects
     * can carry on using it.
     *
     * @method Phaser.Animations.AnimationManager#remove
     * @fires Phaser.Animations.Events#REMOVE_ANIMATION
     * @since 3.0.0
     *
     * @param {string} key - The key of the animation to remove.
     *
     * @return {Phaser.Animations.Animation} The Animation instance that was removed from the Animation Manager.
     */
    remove: function (key)
    {
        var anim = this.get(key);

        if (anim)
        {
            this.emit(Events.REMOVE_ANIMATION, key, anim);

            this.anims.delete(key);
        }

        return anim;
    },

    /**
     * Resume all paused animations.
     *
     * @method Phaser.Animations.AnimationManager#resumeAll
     * @fires Phaser.Animations.Events#RESUME_ALL
     * @since 3.0.0
     *
     * @return {this} This Animation Manager.
     */
    resumeAll: function ()
    {
        if (this.paused)
        {
            this.paused = false;

            this.emit(Events.RESUME_ALL);
        }

        return this;
    },

    /**
     * Returns the Animation data as JavaScript object based on the given key.
     * Or, if not key is defined, it will return the data of all animations as array of objects.
     *
     * @method Phaser.Animations.AnimationManager#toJSON
     * @since 3.0.0
     *
     * @param {string} [key] - The animation to get the JSONAnimation data from. If not provided, all animations are returned as an array.
     *
     * @return {Phaser.Types.Animations.JSONAnimations} The resulting JSONAnimations formatted object.
     */
    toJSON: function (key)
    {
        var output = {
            anims: [],
            globalTimeScale: this.globalTimeScale
        };

        if (key !== undefined && key !== '')
        {
            output.anims.push(this.anims.get(key).toJSON());
        }
        else
        {
            this.anims.each(function (animationKey, animation)
            {
                output.anims.push(animation.toJSON());
            });
        }

        return output;
    },

    /**
     * Destroy this Animation Manager and clean up animation definitions and references to other objects.
     * This method should not be called directly. It will be called automatically as a response to a `destroy` event from the Phaser.Game instance.
     *
     * @method Phaser.Animations.AnimationManager#destroy
     * @since 3.0.0
     */
    destroy: function ()
    {
        this.anims.clear();

        this.textureManager = null;

        this.game = null;
    }

});

module.exports = AnimationManager;
