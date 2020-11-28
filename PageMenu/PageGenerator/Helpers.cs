using Humanizer;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace PageGenerator
{
    public static class Helpers
    {
        static int WordIndex = 0;
        static int CurrentIndent = 0;

        public static void AddPageStart(this StringBuilder sb, string formConfigFileName, string buttonsConfigFileName, ExternalLibrary? externalLibrary)
        {
            sb.AppendLine(@"<!DOCTYPE html>");
            sb.AppendLine(@"<html>");
            sb.AppendLine(@"<head>");

            if (externalLibrary.HasValue)
            {
                switch(externalLibrary.Value)
                {
                    case ExternalLibrary.Bootstrap3:
                        sb.AppendLine(@"<link rel=""stylesheet"" href=""bootstrap-3.3.7-dist/css/bootstrap.min.css"">");
                        break;
                    case ExternalLibrary.Bootstrap4:
                        sb.AppendLine(@"<link rel=""stylesheet"" href=""bootstrap-4.5.3-dist/css/bootstrap.min.css"">");
                        break;
                }
            }

            sb.AppendLine(@"<link rel=""stylesheet"" href=""style.css"">");
            sb.AppendLine(@$"<link rel=""stylesheet"" href=""{PathConstants.DevFromTest}formmenu.css"">");
            sb.AppendLine(@$"<link rel=""stylesheet"" href=""{PathConstants.DevFromTest}{formConfigFileName}.formmenu.css"">");
            sb.AppendLine(@$"<link rel=""stylesheet"" href=""{PathConstants.DevFromTest}{buttonsConfigFileName}.buttons.css"">");
            sb.AppendLine(@"</head>");
            sb.AppendLine(@"<body>");
            sb.AppendLine(@"<div class=""inner"">");
        }

        public static void AddPageEnd(this StringBuilder sb, string outFileName, string formConfigFileName, 
            string buttonsConfigFileName, ExternalLibrary? externalLibrary)
        {
            sb.AppendLine(@"</div>");
            sb.AppendLine(@$"<script src=""{PathConstants.DevFromTest}formmenu.js""></script>");

            // Write script tag for page specific config file
            sb.AppendLine(@$"<script src=""{outFileName}.formmenu.config.js""></script>");

            // Write script tag for developed config file to be tested

            if (!string.IsNullOrEmpty(formConfigFileName))
            {
                sb.AppendLine(@$"<script src=""{PathConstants.DevFromTest}{formConfigFileName}.formmenu.config.js""></script>");
            }

            if (!string.IsNullOrEmpty(buttonsConfigFileName))
            {
                sb.AppendLine(@$"<script src=""{PathConstants.DevFromTest}{buttonsConfigFileName}.buttons.config.js""></script>");
            }

            if (externalLibrary.HasValue)
            {
                switch (externalLibrary.Value)
                {
                    case ExternalLibrary.Bootstrap3:
                        sb.AppendLine(@"<script src=""bootstrap-3.3.7-dist/js/bootstrap.min.js""></script>");
                        break;
                    case ExternalLibrary.Bootstrap4:
                        sb.AppendLine(@"<script src=""bootstrap-4.5.3-dist/js/bootstrap.min.js""></script>");
                        break;
                }
            }

            sb.AppendLine(@"</body>");
            sb.AppendLine(@"</html>");
        }

        public static void WriteTestPage(Action<StringBuilder> buildPage, string outFileName, string formConfigFileName, 
            string buttonsConfigFileName, ExternalLibrary? externalLibrary = null)
        {
            var sb = new StringBuilder();

            sb.AddPageStart(formConfigFileName, buttonsConfigFileName, externalLibrary);
            buildPage(sb);

            sb.AddPageEnd(outFileName, formConfigFileName, buttonsConfigFileName, externalLibrary);
            sb.WriteToFile(PathConstants.Test + outFileName + ".html");
        }

        public static void AddHeading(this StringBuilder sb, int level)
        {
            // Indent of this heading will be that produced by the parent heading
            CurrentIndent = (level - 1) * 4;

            sb.AppendLine(@"");
            string caption = GetRandomWord().Humanize(LetterCasing.Title);
            string line = $"<H{level}>{caption}</H{level}>";
            sb.AddIndentedLine(line);

            CurrentIndent = level * 4;
        }

        public static void AddOneOfEach(this StringBuilder sb)
        {
            sb.AddInput(false, false);
            sb.AddInput(true, false);
            sb.AddInput(false, true);
            sb.AddInput(true, true);

            sb.AddSelect(false);
            sb.AddSelect(true);

            sb.Addtextarea(false);
            sb.Addtextarea(true);

            sb.AddCheckbox(false);
            sb.AddCheckbox(true);

            sb.AddRadiobutton();
        }

        // For a list of form elements, see
        // https://www.w3schools.com/html/html_form_elements.asp

        public static void AddInput(this StringBuilder sb, bool required, bool isEmail)
        {
            sb.AppendLine(@"");
            string caption = GetRandomWord().Humanize(LetterCasing.Title);
            string id = caption.ToLower().Replace(" ", "");

            sb.AddIndentedLine("<p>");

            string requiredClassString = required ? " class=\"required\"" : "";
            string emailString = isEmail ? " Email" : "";
            sb.Append(new String(' ', CurrentIndent + 4));
            sb.AppendLine($"<label{requiredClassString} for=\"{id}\">{caption}{emailString}</label>");

            sb.Append(new String(' ', CurrentIndent + 4));
            string requiredString = required ? " required" : "";
            string typeString = isEmail ? "email" : "text";
            sb.AppendLine($"<input type=\"{typeString}\" id=\"{id}\"{requiredString}>");

            sb.AddIndentedLine("</p>");
        }

        public static void AddSelect(this StringBuilder sb, bool required)
        {
            sb.AppendLine(@"");
            string caption = GetRandomWord().Humanize(LetterCasing.Title);
            string id = caption.ToLower().Replace(" ", "");

            sb.AddIndentedLine("<p>");

            string requiredClassString = required ? " class=\"required\"" : "";
            sb.AddIndentedLine($"<label{requiredClassString} for=\"{id}\">{caption}</label>", 4);

            string requiredString = required ? " required" : "";
            sb.AddIndentedLine($"<select id=\"{id}\"{requiredString}>", 4);

            sb.AddIndentedLine($"<option value=\"\">Select</option>", 8);

            for (int j = 0; j < 4; j++)
            {
                string optionCaption = GetRandomWord().Humanize(LetterCasing.Title);
                string optionId = optionCaption.ToLower().Replace(" ", "");

                sb.AddIndentedLine($"<option value=\"{optionId}\">{optionCaption}</option>", 8);
            }

            sb.AddIndentedLine("</select>", 4);

            sb.AddIndentedLine("</p>");
        }

        public static void Addtextarea(this StringBuilder sb, bool required)
        {
            sb.AppendLine(@"");
            string caption = GetRandomWord().Humanize(LetterCasing.Title);
            string id = caption.ToLower().Replace(" ", "");

            sb.AddIndentedLine("<p>");

            string requiredClassString = required ? " class=\"required\"" : "";
            sb.AddIndentedLine($"<label{requiredClassString} for=\"{id}\">{caption}</label>", 4);

            string requiredString = required ? " required" : "";
            sb.AddIndentedLine($"<textarea rows=\"4\" cols=\"50\" id=\"{id}\"{requiredString}></textarea>", 4);

            sb.AddIndentedLine("</p>");
        }

        public static void AddCheckbox(this StringBuilder sb, bool required)
        {
            sb.AppendLine(@"");
            string caption = GetRandomWord().Humanize(LetterCasing.Title);
            string id = caption.ToLower().Replace(" ", "");

            sb.AddIndentedLine("<p>");

            string requiredString = required ? " required" : "";
            sb.AddIndentedLine($"<input type=\"checkbox\" id=\"{id}\" value=\"{caption}\"{requiredString}>", 4);

            string requiredClassString = required ? " class=\"required\"" : "";
            sb.AddIndentedLine($"<label{requiredClassString} for=\"{id}\">{caption}</label>", 4);

            sb.AddIndentedLine("</p>");
        }

        public static void AddRadiobutton(this StringBuilder sb)
        {
            sb.AppendLine(@"");

            string s = GetRandomWord().Humanize(LetterCasing.Title);
            string radioGroupName = s.ToLower().Replace(" ", "");

            sb.AddIndentedLine("<p>");
            sb.AddIndentedLine("<fieldset>", 4);
            sb.AddIndentedLine($"<legend>{s}</legend>", 8);

            for (int j = 0; j < 4; j++)
            {
                string caption = GetRandomWord().Humanize(LetterCasing.Title);
                string id = caption.ToLower().Replace(" ", "");

                sb.AddIndentedLine($"<input type=\"radio\" name=\"{radioGroupName}\" id=\"{id}\" value=\"{caption}\">", 8);
                sb.AddIndentedLine($"<label for=\"{id}\">{caption}</label>", 8);
            }

            sb.AddIndentedLine("</fieldset>", 4);
            sb.AddIndentedLine("</p>");
        }

        public static void AddLoremIpsum(this StringBuilder sb, int numParagraphs)
        {
            LoremIpsum(sb, 5, 40, 1, 5, numParagraphs);
        }

        public static void AddIndentedLine(this StringBuilder sb, string line, int extraIndent = 0)
        {
            string indentedLine = (new String(' ', CurrentIndent + extraIndent)) + line;
            sb.AppendLine(indentedLine);
        }

        public static void WriteToFile(this StringBuilder sb, string filePath)
        {
            string text = sb.ToString();
            File.WriteAllText(filePath, text);
        }

        public static string GetRandomWord()
        {
            int nbrWords = EnglishWords.LongList.Count;
            string word = EnglishWords.LongList[(WordIndex++) % nbrWords];
            return word;
        }

        public static void LoremIpsum(StringBuilder sb, int minWords, int maxWords,
                                            int minSentences, int maxSentences,
                                            int numParagraphs)
        {

            var words = new[]{"lorem", "ipsum", "dolor", "sit", "amet", "consectetuer",
        "adipiscing", "elit", "sed", "diam", "nonummy", "nibh", "euismod",
        "tincidunt", "ut", "laoreet", "dolore", "magna", "aliquam", "erat"};

            var rand = new Random();
            int numSentences = rand.Next(maxSentences - minSentences)
                + minSentences + 1;
            int numWords = rand.Next(maxWords - minWords) + minWords + 1;

            for (int p = 0; p < numParagraphs; p++)
            {
                sb.AddIndentedLine("<p>");
                for (int s = 0; s < numSentences; s++)
                {
                    sb.Append(new String(' ', CurrentIndent + 4));
                    for (int w = 0; w < numWords; w++)
                    {
                        if (w > 0) { sb.Append(" "); }
                        sb.Append(words[rand.Next(words.Length)]);
                    }
                    sb.AppendLine(". ");
                }
                sb.AddIndentedLine("</p>");
            }
        }
    }
}
