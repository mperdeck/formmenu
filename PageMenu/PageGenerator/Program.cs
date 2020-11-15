using System;
using System.Text;

namespace PageGenerator
{
    // Writes test page to current directory


    /// <summary>
    /// Writes test page to file.
    /// File path (relative to current dir) is given in first argument.
    /// </summary>
    class Program
    {
        static void Main(string[] args)
        {
            Helpers.WriteTestPage(TestPage.LongPageNoForm, "test1", "", "");
            Helpers.WriteTestPage(TestPage.LongFormOneLevel, "longform1", "html5form", "buttonstest");
            Helpers.WriteTestPage(TestPage.ShortFormOneLevel, "shortform1", "html5form", "buttonstest");
            Helpers.WriteTestPage(TestPage.TinyFormOneLevel, "tinyform1", "html5form", "buttonstest");
        }
    }
}
