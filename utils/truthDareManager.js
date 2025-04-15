const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

class TruthDareManager {
    constructor(client) {
        this.client = client;
        this.dataPath = path.join(__dirname, '../data/truthDare.json');
        this.loadQuestions();
    }
    
    /**
     * Load saved truth or dare questions from the data file
     */
    loadQuestions() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                this.truthQuestions = data.truthQuestions || this.getDefaultTruthQuestions();
                this.dareQuestions = data.dareQuestions || this.getDefaultDareQuestions();
                
                console.log(`Loaded ${this.truthQuestions.length} truth questions and ${this.dareQuestions.length} dare questions.`);
            } else {
                // Initialize with default questions
                this.truthQuestions = this.getDefaultTruthQuestions();
                this.dareQuestions = this.getDefaultDareQuestions();
                this.saveQuestions();
                
                console.log('Created default truth and dare questions.');
            }
        } catch (error) {
            console.error('Error loading truth or dare questions:', error);
            // Initialize with defaults if loading fails
            this.truthQuestions = this.getDefaultTruthQuestions();
            this.dareQuestions = this.getDefaultDareQuestions();
        }
    }
    
    /**
     * Save questions to the data file
     */
    saveQuestions() {
        try {
            const data = {
                truthQuestions: this.truthQuestions,
                dareQuestions: this.dareQuestions
            };
            
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving truth or dare questions:', error);
        }
    }
    
    /**
     * Get default truth questions
     * @returns {Array<string>} Default truth questions
     */
    getDefaultTruthQuestions() {
        return [
            "What's the most embarrassing thing you've ever done?",
            "What's one secret you've never told anyone?",
            "What's your biggest fear?",
            "What's the worst thing you've ever done?",
            "What's the biggest mistake you've made?",
            "What's one thing you wish you could change about yourself?",
            "Who do you have a crush on?",
            "What's the most embarrassing thing in your search history?",
            "What's the most childish thing you still do?",
            "What's the worst lie you've ever told?",
            "What's the worst grade you've received?",
            "What's one thing you'd change about your appearance?",
            "What's the most trouble you've been in?",
            "What's something you've done that you're most proud of?",
            "What's your biggest insecurity?",
            "What's your biggest regret?",
            "What's the last lie you told?",
            "What's the weirdest thought you've had?",
            "What's the worst advice you've given?",
            "What's the worst advice you've taken?"
        ];
    }
    
    /**
     * Get default dare questions
     * @returns {Array<string>} Default dare questions
     */
    getDefaultDareQuestions() {
        return [
            "Do your best impression of someone in the group.",
            "Talk in a British accent for the next 5 minutes.",
            "Wear socks on your hands for the next 10 minutes.",
            "Call a random contact and sing them 'Happy Birthday.'",
            "Speak only in song lyrics for the next 3 rounds.",
            "Try to lick your elbow.",
            "Wrap yourself in toilet paper like a mummy.",
            "Dance like a ballerina for 1 minute.",
            "Do 10 jumping jacks shouting a weird word each time.",
            "Draw a face on your hand and talk to it for the next 3 rounds",
            "Send a cringe selfie to your crush.",
            "Read your last 5 Google searches out loud.",
            "Post an embarrassing photo on your story for 10 minutes.",
            "Do your best impression of a crying baby.",
            "Text someone 'I have a crush on you' and screenshot their reply.",
            "Put a spoon of peanut butter on your nose and leave it there for 5 minutes.",
            "Say the alphabet backward as fast as you can.",
            "Let someone write something on your forehead with a marker.",
            "Let someone go through your phone gallery for 30 seconds.",
            "Speak in baby talk for the next 5 minutes.",
            "Compliment the person to your right in the most flirty way possible.",
            "Let someone go through your Tinder or DMs.",
            "Say who in the group you'd kiss if you had to.",
            "Pretend to flirt with a random object.",
            "Do a slow, dramatic hair flip and wink.",
            "Whisper a pickup line to the person across from you.",
            "Send a flirty DM to a random person.",
            "Post 'I'm in love 😍' on your story for 5 minutes.",
            "Let someone write a flirty caption and post it for you.",
            "Draw a heart on your cheek and keep it there.",
            "Pretend to be a cat for the next 2 minutes.",
            "Act like you're giving a dramatic Oscar acceptance speech.",
            "Pretend you're possessed and try to scare someone.",
            "Be a waiter/waitress taking fake orders.",
            "Act like you're an alien seeing Earth for the first time.",
            "Do your best soap opera scene.",
            "Pretend to be the group leader and give a motivational speech.",
            "Recreate a TikTok dance without the music.",
            "Do a runway walk with dramatic flair.",
            "Pretend your hand is your crush and talk to it romantically.",
            "Try to whistle with crackers in your mouth.",
            "Try to touch your nose with your tongue.",
            "Balance a spoon on your nose.",
            "Speak with your tongue sticking out for 3 minutes.",
            "Try to type with your toes.",
            "Try to juggle 3 random objects.",
            "Talk without moving your lips.",
            "Say 'I'm a chicken' after everything you say for 5 minutes.",
            "Make a sandwich while blindfolded.",
            "Eat a slice of lemon with a straight face.",
            "Eat something without using your hands.",
            "Eat a spoonful of mustard/ketchup.",
            "Take a weird food combo dare.",
            "Make a 'mystery drink' and take a sip.",
            "Let someone else feed you something blindfolded.",
            "Mix 3 drinks together and take a sip.",
            "Eat a bite of something with your eyes closed.",
            "Gargle a song.",
            "Eat something spicy and try not to react.",
            "Post 'I'm quitting social media' on your story.",
            "Change your relationship status to 'engaged' for 5 minutes.",
            "Post 'I have something to tell you all…' with no explanation.",
            "Send the first emoji on your keyboard to 5 random people.",
            "Post a silly photo with no caption.",
            "Put a weird filter and keep it on for the next video call round.",
            "Let someone else post a status from your account.",
            "Screenshot your explore page and show the group.",
            "Comment 'I'm watching you 👀' on a friend's post.",
            "Follow someone random and DM them.",
            "Recite a tongue twister 3 times fast.",
            "Speak in rhymes for the next round.",
            "Say a word backwards and have others guess what it is.",
            "Make up a song about another player.",
            "Make up a new dance move and name it.",
            "Explain how the internet works in a dramatic voice.",
            "Spell your full name backward.",
            "Make up a silly conspiracy theory.",
            "Describe your dream pet in 10 seconds.",
            "Invent a new word and define it.",
            "Pick a random number and do that number of squats.",
            "Take a selfie with the weirdest item in the room.",
            "Let someone else make your next dare.",
            "Close your eyes and let someone put a sticker on you.",
            "Text your mom 'What's the Wi-Fi password again?' and screenshot the reply.",
            "Hold a weird pose for a full minute.",
            "Let someone take a weird photo of you.",
            "Say the first word that comes to your mind after each person talks.",
            "Let someone draw something on your arm.",
            "Take a 'ghost' selfie in the dark.",
            "Do a catwalk wearing mismatched clothes.",
            "Try on lipstick/blush (regardless of gender).",
            "Make up and sing a theme song for yourself.",
            "Compliment yourself in the mirror for a full minute.",
            "Do a TikTok dance in slow motion.",
            "Do a dramatic soap opera slap scene (fake slap).",
            "Take a 'model' photo shoot using only kitchen items.",
            "Draw a mustache on yourself and own it.",
            "Pose like a statue for a full round.",
            "Make up a new fashion trend and model it."
        ];
    }
    
    /**
     * Add a new question to the collection
     * @param {string} type - 'truth' or 'dare'
     * @param {string} question - The question to add
     * @returns {boolean} Whether the question was added
     */
    addQuestion(type, question) {
        if (!question || question.trim() === '') {
            return false;
        }
        
        if (type === 'truth') {
            if (!this.truthQuestions.includes(question)) {
                this.truthQuestions.push(question);
                this.saveQuestions();
                return true;
            }
        } else if (type === 'dare') {
            if (!this.dareQuestions.includes(question)) {
                this.dareQuestions.push(question);
                this.saveQuestions();
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get a random question
     * @param {string} type - 'truth' or 'dare'
     * @returns {string} A random question
     */
    getRandomQuestion(type) {
        if (type === 'truth') {
            const randomIndex = Math.floor(Math.random() * this.truthQuestions.length);
            return this.truthQuestions[randomIndex];
        } else if (type === 'dare') {
            const randomIndex = Math.floor(Math.random() * this.dareQuestions.length);
            return this.dareQuestions[randomIndex];
        }
        
        return 'No questions available.';
    }
    
    /**
     * Start a new Truth or Dare game
     * @param {Object} options - Game options
     * @returns {Promise<Message>} The sent message
     */
    async startGame(channel) {
        try {
            // Create Truth or Dare buttons
            const truthButton = new ButtonBuilder()
                .setCustomId('truth_button')
                .setLabel('Truth')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🤔');
                
            const dareButton = new ButtonBuilder()
                .setCustomId('dare_button')
                .setLabel('Dare')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔥');
                
            const addQuestionButton = new ButtonBuilder()
                .setCustomId('add_question')
                .setLabel('Add Your Question')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕');
                
            const row = new ActionRowBuilder()
                .addComponents(truthButton, dareButton, addQuestionButton);
                
            // Create game embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('Truth or Dare')
                .setDescription('Choose "Truth" to answer a personal question, or "Dare" to perform a challenge!')
                .addFields(
                    { 
                        name: 'How to Play', 
                        value: 'Click a button below to get a random truth question or dare challenge. You can also add your own questions!'
                    }
                )
                .setFooter({ 
                    text: `Truth: ${this.truthQuestions.length} questions | Dare: ${this.dareQuestions.length} questions`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
                
            // Send the game message
            return await channel.send({ 
                embeds: [embed], 
                components: [row] 
            });
        } catch (error) {
            console.error('Error starting Truth or Dare game:', error);
            throw error;
        }
    }
    
    /**
     * Handle button interaction for Truth or Dare
     * @param {Interaction} interaction - The button interaction
     */
    async handleButtonInteraction(interaction) {
        try {
            if (interaction.customId === 'truth_button') {
                await this.handleTruthButton(interaction);
            } else if (interaction.customId === 'dare_button') {
                await this.handleDareButton(interaction);
            } else if (interaction.customId === 'add_question') {
                await this.handleAddQuestionButton(interaction);
            }
        } catch (error) {
            console.error('Error handling Truth or Dare button:', error);
            try {
                // Try to respond if we haven't already
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: 'There was an error processing your request. Please try again.', 
                        ephemeral: true 
                    });
                }
            } catch (replyError) {
                console.error('Error replying to interaction:', replyError);
            }
        }
    }
    
    /**
     * Handle Truth button press
     * @param {Interaction} interaction - The button interaction
     */
    async handleTruthButton(interaction) {
        // Get a random truth question
        const question = this.getRandomQuestion('truth');
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Truth Question')
            .setDescription(question)
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
            
        // Create buttons for the next round
        const truthButton = new ButtonBuilder()
            .setCustomId('truth_button')
            .setLabel('Another Truth')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤔');
            
        const dareButton = new ButtonBuilder()
            .setCustomId('dare_button')
            .setLabel('Try a Dare')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔥');
            
        const addQuestionButton = new ButtonBuilder()
            .setCustomId('add_question')
            .setLabel('Add Question')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');
            
        const row = new ActionRowBuilder()
            .addComponents(truthButton, dareButton, addQuestionButton);
            
        // Respond with the question
        await interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    }
    
    /**
     * Handle Dare button press
     * @param {Interaction} interaction - The button interaction
     */
    async handleDareButton(interaction) {
        // Get a random dare challenge
        const challenge = this.getRandomQuestion('dare');
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('Dare Challenge')
            .setDescription(challenge)
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
            
        // Create buttons for the next round
        const truthButton = new ButtonBuilder()
            .setCustomId('truth_button')
            .setLabel('Try a Truth')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤔');
            
        const dareButton = new ButtonBuilder()
            .setCustomId('dare_button')
            .setLabel('Another Dare')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔥');
            
        const addQuestionButton = new ButtonBuilder()
            .setCustomId('add_question')
            .setLabel('Add Question')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');
            
        const row = new ActionRowBuilder()
            .addComponents(truthButton, dareButton, addQuestionButton);
            
        // Respond with the challenge
        await interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    }
    
    /**
     * Handle Add Question button press
     * @param {Interaction} interaction - The button interaction
     */
    async handleAddQuestionButton(interaction) {
        // Create modal for adding a question
        const modal = new ModalBuilder()
            .setCustomId('add_question_modal')
            .setTitle('Add a Truth or Dare Question');
            
        // Create dropdown for question type
        const typeInput = new TextInputBuilder()
            .setCustomId('question_type')
            .setLabel('Type (truth or dare)')
            .setPlaceholder('Enter "truth" or "dare"')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        const questionInput = new TextInputBuilder()
            .setCustomId('question_text')
            .setLabel('Your Question or Challenge')
            .setPlaceholder('Enter your truth question or dare challenge here')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
            
        // Add inputs to the modal
        const typeRow = new ActionRowBuilder().addComponents(typeInput);
        const questionRow = new ActionRowBuilder().addComponents(questionInput);
        modal.addComponents(typeRow, questionRow);
        
        // Show the modal
        await interaction.showModal(modal);
    }
    
    /**
     * Handle modal submission for adding questions
     * @param {Interaction} interaction - The modal interaction
     */
    async handleModalSubmission(interaction) {
        try {
            if (interaction.customId === 'add_question_modal') {
                // Get the values from the modal
                const type = interaction.fields.getTextInputValue('question_type').toLowerCase().trim();
                const question = interaction.fields.getTextInputValue('question_text').trim();
                
                // Validate type
                if (type !== 'truth' && type !== 'dare') {
                    await interaction.reply({ 
                        content: 'Invalid question type. Please use "truth" or "dare".',
                        ephemeral: true
                    });
                    return;
                }
                
                // Add the question
                const added = this.addQuestion(type, question);
                
                if (added) {
                    await interaction.reply({ 
                        content: `Your ${type} question has been added successfully!`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({ 
                        content: 'This question already exists or is invalid.',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('Error handling modal submission:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: 'There was an error processing your question. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error replying to modal submission:', replyError);
            }
        }
    }
}

module.exports = TruthDareManager;