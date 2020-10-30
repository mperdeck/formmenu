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
            TestPage.LongPageNoForm();
            TestPage.LongFormOneLevel();
        }
    }
}
